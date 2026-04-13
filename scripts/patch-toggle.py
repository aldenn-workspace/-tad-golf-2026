with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'r') as f:
    content = f.read()

old = '''async function togglePortfolioDetail(key, fundId, company) {
  if (_portfolioExpanded.has(key)) {
    _portfolioExpanded.delete(key);
    document.querySelectorAll('.subrow-'+key).forEach(el => el.remove());
    const btn = document.getElementById('expand-'+key);
    if (btn) btn.textContent = '▶';
    return;
  }
  _portfolioExpanded.add(key);
  const btn = document.getElementById('expand-'+key);
  if (btn) btn.textContent = '▼';
  const cacheKey = fundId+'||'+company;
  if (!_portfolioSubcache[cacheKey]) {
    const subs = await fetch('/api/portfolio/subpositions?fund_id='+encodeURIComponent(fundId)+'&company='+encodeURIComponent(company)).then(r=>r.json());
    _portfolioSubcache[cacheKey] = subs;
  }
  const subs = _portfolioSubcache[cacheKey];
  const row = document.getElementById('mainrow-'+key);
  if (!row) return;
  const colCount = row.cells.length;
  // Build sub-rows as real <tr> elements inserted directly into the main table — ensures column alignment
  const tbody = document.getElementById('portfolio-main-table')?.querySelector('tbody');
  if (!tbody) return;
  // Remove any existing sub-rows for this key
  document.querySelectorAll('.subrow-'+key).forEach(el => el.remove());

  // Insert in reverse so afterend ordering is correct
  [...subs].reverse().forEach(s => {
    const moic = s.cost > 0 ? (s.fair_value/s.cost).toFixed(1)+'x' : '—';
    const moicColor = s.cost > 0 && s.fair_value/s.cost >= 2 ? '#22c55e' : s.cost > 0 && s.fair_value/s.cost < 1 ? '#ef4444' : 'var(--text)';
    const gc = s.unrealized_gain > 0 ? '#22c55e' : s.unrealized_gain < 0 ? '#ef4444' : 'var(--text-muted)';
    const cc = s.change_in_fv > 0 ? '#22c55e' : s.change_in_fv < 0 ? '#ef4444' : 'var(--text-muted)';
    const tr = document.createElement('tr');
    tr.className = 'subrow-'+key;
    tr.id = (subs.indexOf ? '' : '');
    tr.style.cssText = 'background:rgba(124,111,247,.07);border-bottom:1px solid rgba(124,111,247,.15)';
    tr.innerHTML = `
      <td style="padding:5px 6px"></td>
      <td style="padding:5px 10px;font-size:11px;color:var(--text-muted)"></td>
      <td style="padding:5px 10px;font-size:11px;color:var(--accent);font-style:italic;white-space:nowrap">${esc(s.round)}</td>
      <td style="padding:5px 10px;font-size:11px;color:var(--text-muted);white-space:nowrap">${(s.date||'').slice(0,10)}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">—</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.shares>0?Math.round(s.shares).toLocaleString():'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.cost_per_share>0?'$'+s.cost_per_share.toFixed(4):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.fmv_per_share>0?'$'+s.fmv_per_share.toFixed(4):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.cost>0?fmtM(s.cost):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:700;color:var(--text)">${s.fair_value>0?fmtM(s.fair_value):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:700;color:${moicColor}">${moic}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:${gc}">${s.unrealized_gain!==0?(s.unrealized_gain>0?'+':'')+fmtM(s.unrealized_gain):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:${cc}">${s.change_in_fv!==0?(s.change_in_fv>0?'+':'')+fmtM(s.change_in_fv):'—'}</td>
      <td style="padding:5px 10px;font-size:10px;color:var(--text-muted);white-space:normal;word-wrap:break-word;max-width:260px">${esc(s.comments)}</td>
      ${_portfolioSingleFund ? `<td></td>` : ''}
    `;
    row.insertAdjacentElement('afterend', tr);
  });
}'''

new = '''async function togglePortfolioDetail(key, fundId, company) {
  if (_portfolioExpanded.has(key)) {
    _portfolioExpanded.delete(key);
    document.querySelectorAll('.subrow-'+key).forEach(el => el.remove());
    const btn = document.getElementById('expand-'+key);
    if (btn) btn.textContent = '▶';
    return;
  }
  _portfolioExpanded.add(key);
  const btn = document.getElementById('expand-'+key);
  if (btn) btn.textContent = '▼';

  const cacheKey = fundId+'||'+company;
  if (!_portfolioSubcache[cacheKey]) {
    try {
      const res = await fetch('/api/portfolio/subpositions?fund_id='+encodeURIComponent(fundId)+'&company='+encodeURIComponent(company));
      _portfolioSubcache[cacheKey] = await res.json();
    } catch(e) { console.error('subpositions fetch failed', e); return; }
  }
  const subs = _portfolioSubcache[cacheKey];
  if (!subs || !subs.length) return;

  const row = document.getElementById('mainrow-'+key);
  if (!row) return;

  // Remove any stale rows
  document.querySelectorAll('.subrow-'+key).forEach(el => el.remove());

  // Insert sub-rows directly after main row (forward order, each afterend pushes down)
  subs.forEach((s, si) => {
    const moic = s.cost > 0 ? (s.fair_value/s.cost).toFixed(1)+'x' : '—';
    const moicColor = s.cost > 0 && s.fair_value/s.cost >= 2 ? '#22c55e' : s.cost > 0 && s.fair_value/s.cost < 1 ? '#ef4444' : 'var(--text)';
    const gc = s.unrealized_gain > 0 ? '#22c55e' : s.unrealized_gain < 0 ? '#ef4444' : 'var(--text-muted)';
    const cc = s.change_in_fv > 0 ? '#22c55e' : s.change_in_fv < 0 ? '#ef4444' : 'var(--text-muted)';
    const tr = document.createElement('tr');
    tr.className = 'subrow-'+key;
    tr.style.cssText = 'background:rgba(124,111,247,.07);border-bottom:1px solid rgba(124,111,247,.15)';
    tr.innerHTML =
      '<td style="padding:5px 6px"></td>' +
      '<td style="padding:5px 10px;font-size:11px;color:var(--text-muted)"></td>' +
      '<td style="padding:5px 10px;font-size:11px;color:var(--accent);font-style:italic;white-space:nowrap">'+esc(s.round)+'</td>' +
      '<td style="padding:5px 10px;font-size:11px;color:var(--text-muted);white-space:nowrap">'+(s.date||'').slice(0,10)+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">—</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">'+(s.shares>0?Math.round(s.shares).toLocaleString():'—')+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">'+(s.cost_per_share>0?'$'+s.cost_per_share.toFixed(4):'—')+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">'+(s.fmv_per_share>0?'$'+s.fmv_per_share.toFixed(4):'—')+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">'+(s.cost>0?fmtM(s.cost):'—')+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:700;color:var(--text)">'+(s.fair_value>0?fmtM(s.fair_value):'—')+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:700;color:'+moicColor+'">'+moic+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:'+gc+'">'+(s.unrealized_gain!==0?(s.unrealized_gain>0?'+':'')+fmtM(s.unrealized_gain):'—')+'</td>' +
      '<td style="padding:5px 10px;text-align:right;font-size:11px;color:'+cc+'">'+(s.change_in_fv!==0?(s.change_in_fv>0?'+':'')+fmtM(s.change_in_fv):'—')+'</td>' +
      '<td style="padding:5px 10px;font-size:10px;color:var(--text-muted);white-space:normal;word-wrap:break-word;max-width:260px">'+esc(s.comments)+'</td>' +
      (_portfolioSingleFund ? '<td></td>' : '');
    // Insert: first sub after main row, subsequent after previous sub
    if (si === 0) {
      row.insertAdjacentElement('afterend', tr);
    } else {
      const prev = document.querySelectorAll('.subrow-'+key)[si-1];
      if (prev) prev.insertAdjacentElement('afterend', tr);
      else row.insertAdjacentElement('afterend', tr);
    }
  });
}'''

if old in content:
    content = content.replace(old, new, 1)
    print('Patched')
else:
    print('NOT FOUND')

with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'w') as f:
    f.write(content)
