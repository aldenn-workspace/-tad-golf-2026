const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3461;
const TOKEN_FILE = path.join(__dirname, '../whoop-auth/tokens.json');
const CLIENT_ID = '87722d0b-84a6-42bb-acbc-287ad1ec63a3';
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || '';

function getTokens() {
  return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
}
function saveTokens(tokens) {
  tokens.fetched_at = new Date().toISOString();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

function refreshToken() {
  return new Promise((resolve, reject) => {
    const tokens = getTokens();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });
    const options = {
      hostname: 'api.prod.whoop.com',
      path: '/oauth/oauth2/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const t = JSON.parse(data);
          if (t.access_token) { saveTokens(t); resolve(t.access_token); }
          else reject(new Error('No token: ' + data));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

function whoopGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.prod.whoop.com',
      path: `/developer/${endpoint}`,
      headers: { 'Authorization': `Bearer ${token}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 401) { reject(new Error('401')); return; }
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchAll(endpoint, token, limit = 25, maxRecords = 100) {
  let records = [];
  let nextToken = null;
  do {
    const q = `limit=${limit}${nextToken ? '&nextToken=' + nextToken : ''}`;
    const data = await whoopGet(`${endpoint}?${q}`, token);
    records = records.concat(data.records || []);
    nextToken = data.next_token;
  } while (nextToken && records.length < maxRecords);
  return records;
}

async function getToken() {
  const tokens = getTokens();
  const age = Date.now() - new Date(tokens.fetched_at).getTime();
  if (age < (tokens.expires_in || 3600) * 1000 - 60000) return tokens.access_token;
  return refreshToken();
}

// Extract actual Zone 2+ minutes from zone_durations (zones 2–5)
function getZ2PlusMin(w) {
  const z = w.score?.zone_durations || {};
  return Math.round(
    ((z.zone_two_milli || 0) + (z.zone_three_milli || 0) +
     (z.zone_four_milli || 0) + (z.zone_five_milli || 0)) / 60000
  );
}

// HIIT = strain >= 13 or very high HR short session
function isHiit(w) {
  const strain = w.score?.strain || 0;
  const avgHR = w.score?.average_heart_rate || 0;
  const dur = Math.round((new Date(w.end) - new Date(w.start)) / 60000);
  return strain >= 13 || (avgHR >= 140 && dur <= 45);
}

async function getData() {
  let token = await getToken();

  const tryFetch = async () => {
    const [recovery, cycles, workouts] = await Promise.all([
      fetchAll('v2/recovery', token),
      fetchAll('v2/cycle', token),
      fetchAll('v2/activity/workout', token, 25, 100),
    ]);
    return { recovery, cycles, workouts };
  };

  let raw;
  try {
    raw = await tryFetch();
  } catch(e) {
    if (e.message === '401') {
      token = await refreshToken();
      raw = await tryFetch();
    } else throw e;
  }

  const { recovery, cycles, workouts } = raw;

  // Map recovery by cycle_id
  const cycleMap = {};
  cycles.forEach(cy => cycleMap[cy.id] = cy);

  const recoveryRows = recovery.map(rec => {
    const cy = cycleMap[rec.cycle_id];
    return {
      date: rec.created_at.split('T')[0],
      recovery: rec.score?.recovery_score ?? null,
      rhr: rec.score?.resting_heart_rate ?? null,
      hrv: rec.score?.hrv_rmssd_milli ? +rec.score.hrv_rmssd_milli.toFixed(1) : null,
      strain: cy?.score?.strain ? +cy.score.strain.toFixed(1) : null,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Map workouts by date — accumulate actual Z2+ minutes + HIIT flag
  const workoutsByDate = {};
  workouts.forEach(w => {
    const date = w.start.split('T')[0];
    const z2plus = getZ2PlusMin(w);
    const hiit = isHiit(w);
    const dur = Math.round((new Date(w.end) - new Date(w.start)) / 60000);
    const strain = w.score?.strain ? +w.score.strain.toFixed(1) : 0;
    if (!workoutsByDate[date]) workoutsByDate[date] = { z2plusMin: 0, hiitMin: 0, hiit: false, workouts: [] };
    workoutsByDate[date].z2plusMin += z2plus;
    if (hiit) { workoutsByDate[date].hiit = true; workoutsByDate[date].hiitMin += dur; }
    workoutsByDate[date].workouts.push({ sport: w.sport_name, dur, strain, z2plus, hiit });
  });

  return { recovery: recoveryRows, workouts: workoutsByDate };
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);
  if (parsed.pathname === '/api/data') {
    try {
      const data = await getData();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data));
    } catch(e) {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  } else {
    const file = path.join(__dirname, 'index.html');
    fs.readFile(file, (err, content) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`🫀 RHR Tracker → http://localhost:${PORT}`));
