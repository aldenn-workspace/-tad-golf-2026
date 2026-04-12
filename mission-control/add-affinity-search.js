const fs = require('fs');
let content = fs.readFileSync('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'utf8');

// Add Affinity search below the existing company search
const old = `      <input id="company-search" type="text" placeholder="🔍 Search companies..." oninput="loadCompanies(this.value)" style="width:100%;max-width:400px;padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-size:13px">`;

const newHtml = old + `
      <button class="btn btn-ghost" style="margin-left:8px" onclick="searchAffinity()">🖲 Search Affinity</button>
      <span id="affinity-search-status" style="font-size:11px;color:var(--text-muted);margin-left:8px"></span>`;

if (content.includes(old)) {
  content = content.replace(old, newHtml);
  console.log('Added Affinity search button');
} else {
  console.log('Pattern not found');
}

// Add the searchAffinity JS function before loadCompanies
const jsTarget = 'async function loadCompanies(search';
const jsInsert = `async function searchAffinity() {
  const q = document.getElementById('company-search').value.trim();
  if (!q) { alert('Enter a company name to search Affinity'); return; }
  const status = document.getElementById('affinity-search-status');
  status.textContent = 'Searching Affinity...';
  try {
    const res = await fetch('/api/affinity/search?q=' + encodeURIComponent(q));
    const d = await res.json();
    const org = d.org;
    const person = d.person;
    if (!org && !person) {
      status.textContent = 'Not found in Affinity';
    } else {
      let msg = '';
      if (org) msg += '\uD83C\uDFE2 ' + org.name + (org.domain ? ' · ' + org.domain : '');
      if (person) msg += (msg?'  ':'') + '\uD83D\uDC64 ' + [person.firstName, person.lastName].filter(Boolean).join(' ') + (person.primaryEmailAddress ? ' · ' + person.primaryEmailAddress : '');
      status.textContent = msg || 'Found in Affinity';
      status.style.color = '#22c55e';
      setTimeout(() => { status.textContent = ''; status.style.color = ''; }, 8000);
    }
  } catch(e) {
    status.textContent = 'Error';
  }
}

`;

if (content.includes(jsTarget)) {
  content = content.replace(jsTarget, jsInsert + jsTarget);
  console.log('Added searchAffinity JS function');
}

fs.writeFileSync('/Users/mini/.openclaw/workspace/mission-control/public/index.html', content, 'utf8');
console.log('Done');
