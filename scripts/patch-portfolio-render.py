with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'r') as f:
    lines = f.readlines()

start = 4579 - 1  # 0-indexed
end = 4633 - 1    # inclusive

new_code = '''let _portfolioSubcache = {};
let _portfolioExpanded = new Set();

async function togglePortfolioDetail(key, fundId, company) {
  if (_portfolioExpanded.has(key)) {
    _portfolioExpanded.delete(key);
    const el = document.getElementById('subrow-'+key);
    if (el) el.remove();
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
  const subHtml = subs.map(s => {
    const moic = s.cost > 0 ? (s.fair_value/s.cost).toFixed(2)+'x' : '—';
    const moicColor = s.cost > 0 && s.fair_value/s.cost >= 2 ? '#22c55e' : s.cost > 0 && s.fair_value/s.cost < 1 ? '#ef4444' : 'var(--text)';
    const gc = s.unrealized_gain > 0 ? '#22c55e' : s.unrealized_gain < 0 ? '#ef4444' : 'var(--text-muted)';
    const cc = s.change_in_fv > 0 ? '#22c55e' : s.change_in_fv < 0 ? '#ef4444' : 'var(--text-muted)';
    return `<tr style="background:rgba(124,111,247,.07);border-bottom:1px solid rgba(124,111,247,.15)">
      <td style="padding:5px 6px"></td>
      <td style="padding:5px 10px;color:var(--text-muted);font-size:11px"></td>
      <td style="padding:5px 10px;color:var(--accent);font-size:11px;font-style:italic">${esc(s.round)}</td>
      <td style="padding:5px 10px;color:var(--text-muted);font-size:11px">${(s.date||'').slice(0,10)}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">—</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.shares>0?Math.round(s.shares).toLocaleString():'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.cost_per_share>0?'$'+s.cost_per_share.toFixed(4):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.fmv_per_share>0?'$'+s.fmv_per_share.toFixed(4):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:var(--text-muted)">${s.cost>0?fmtM(s.cost):'—'}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:600;color:var(--text)">${fmtM(s.fair_value)}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:700;color:${moicColor}">${moic}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:${gc}">${s.unrealized_gain>0?'+':''}${fmtM(s.unrealized_gain)}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:${cc}">${s.change_in_fv!==0?(s.change_in_fv>0?'+':'')+fmtM(s.change_in_fv):'—'}</td>
      <td style="padding:5px 10px;font-size:10px;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.comments)}</td>
    </tr>`;
  }).join('');
  const subRow = document.createElement('tr');
  subRow.id = 'subrow-'+key;
  subRow.innerHTML = `<td colspan="${colCount}" style="padding:0"><table style="width:100%;border-collapse:collapse">${subHtml}</table></td>`;
  row.insertAdjacentElement('afterend', subRow);
}

function renderPortfolioHoldings(holdings, skipCache) {
  if (!skipCache) {
    _portfolioHoldings = holdings;
    _portfolioSort = { col: 'fair_value', dir: -1 };
    holdings = [...holdings].sort((a,b) => b.fair_value - a.fair_value);
    _portfolioExpanded = new Set();
    _portfolioSubcache = {};
  }
  const el = document.getElementById('portfolio-holdings-table');
  if (!el) return;
  if (!holdings.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px">No holdings</div>'; return; }

  const fundIds = [...new Set(holdings.map(h => h.fund_id))];
  const singleFund = fundIds.length === 1;
  const fundTotalFMV = singleFund ? holdings.reduce((s, h) => s + (h.fair_value || 0), 0) : 0;

  const cols = [
    { label: '', key: '_expand' },
    { label: 'Fund', key: 'fund_id' }, { label: 'Company', key: 'company' },
    { label: 'Date', key: 'date' },
    { label: 'Ownership', key: 'ownership' }, { label: 'Shares', key: 'shares' },
    { label: 'Avg Cost/Sh', key: 'cost_per_share' }, { label: 'FMV/Sh', key: 'fmv_per_share' },
    { label: 'Cost', key: 'cost' }, { label: 'FMV', key: 'fair_value' },
    { label: 'MOIC', key: '_moic' },
    ...(singleFund ? [{ label: '% of Fund', key: '_pct_fund' }] : []),
    { label: 'Unrealized', key: 'unrealized_gain' }, { label: 'Chg QTR', key: 'change_in_fv' },
    { label: 'Comments', key: 'comments' }
  ];

  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px" id="portfolio-main-table">
    <thead>
      <tr style="background:var(--surface2)">
        ${cols.map(c => {
          if (c.key === '_expand') return `<th style="width:24px;padding:8px 6px;border-bottom:1px solid var(--border)"></th>`;
          const active = _portfolioSort.col === c.key;
          const arrow = active ? (_portfolioSort.dir === -1 ? ' ↓' : ' ↑') : '';
          const noSort = ['_moic','_pct_fund'].includes(c.key);
          return `<th ${noSort ? '' : `onclick="sortPortfolio('${c.key}')"`} style="${noSort?'':'cursor:pointer;user-select:none;'}padding:8px 10px;text-align:left;font-size:10px;color:${active?'var(--accent)':'var(--text-muted)'};font-weight:700;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid var(--border)">${c.label}${arrow}</th>`;
        }).join('')}
      </tr>
    </thead>
    <tbody>
      ${holdings.map((h, i) => {
        const key = (h.fund_id+'_'+h.company).replace(/[^a-z0-9]/gi,'_');
        const moic = h.cost > 0 ? (h.fair_value/h.cost).toFixed(2)+'x' : '—';
        const moicColor = h.cost > 0 && h.fair_value/h.cost >= 2 ? '#22c55e' : h.cost > 0 && h.fair_value/h.cost < 1 ? '#ef4444' : 'var(--text)';
        const gain_color = h.unrealized_gain > 0 ? '#22c55e' : h.unrealized_gain < 0 ? '#ef4444' : 'var(--text-muted)';
        const chg_color = h.change_in_fv > 0 ? '#22c55e' : h.change_in_fv < 0 ? '#ef4444' : 'var(--text-muted)';
        const safeCompany = h.company.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");
        return `<tr id="mainrow-${key}" style="border-bottom:1px solid var(--border);${i%2===0?'':'background:rgba(255,255,255,.02)'}">
          <td style="padding:7px 6px;text-align:center">
            <span id="expand-${key}" onclick="togglePortfolioDetail('${key}','${h.fund_id}','${safeCompany}')"
              style="cursor:pointer;color:var(--accent);font-size:11px;user-select:none">▶</span>
          </td>
          <td style="padding:7px 10px;color:var(--accent);font-weight:600">${esc(h.fund_id)}</td>
          <td style="padding:7px 10px;font-weight:600;color:var(--text);white-space:nowrap;cursor:pointer"
              onclick="togglePortfolioDetail('${key}','${h.fund_id}','${safeCompany}')">${esc(h.company)}</td>
          <td style="padding:7px 10px;color:var(--text-muted);white-space:nowrap">${(h.date||'').slice(0,7)}</td>
          <td style="padding:7px 10px;text-align:right;color:var(--text-muted)">${h.ownership != null ? h.ownership.toFixed(1)+'%' : '—'}</td>
          <td style="padding:7px 10px;text-align:right;color:var(--text-muted)">${h.shares > 0 ? Math.round(h.shares).toLocaleString() : '—'}</td>
          <td style="padding:7px 10px;text-align:right;color:var(--text-muted)">${h.cost_per_share > 0 ? '$'+h.cost_per_share.toFixed(2) : '—'}</td>
          <td style="padding:7px 10px;text-align:right;color:var(--text-muted)">${h.fmv_per_share > 0 ? '$'+h.fmv_per_share.toFixed(2) : '—'}</td>
          <td style="padding:7px 10px;text-align:right;color:var(--text-muted)">${h.cost > 0 ? fmtM(h.cost) : '—'}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;color:var(--text)">${fmtM(h.fair_value)}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;color:${moicColor}">${moic}</td>
          ${singleFund ? `<td style="padding:7px 10px;text-align:right;color:var(--text-muted)">${fundTotalFMV > 0 ? ((h.fair_value/fundTotalFMV)*100).toFixed(1)+'%' : '—'}</td>` : ''}
          <td style="padding:7px 10px;text-align:right;font-weight:600;color:${gain_color}">${h.unrealized_gain > 0 ? '+' : ''}${fmtM(h.unrealized_gain)}</td>
          <td style="padding:7px 10px;text-align:right;color:${chg_color}">${h.change_in_fv !== 0 ? (h.change_in_fv > 0 ? '+' : '') + fmtM(h.change_in_fv) : '—'}</td>
          <td style="padding:7px 10px;color:var(--text-muted);font-size:10px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.comments)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}
'''

lines[start:end+1] = [new_code]

with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'w') as f:
    f.writelines(lines)

print('Done. Lines replaced:', start+1, 'to', end+1)
