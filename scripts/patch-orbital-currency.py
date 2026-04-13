with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'r') as f:
    content = f.read()

old = '''    cards.innerHTML = funds.map(f => {
      const moic = f.cost > 0 ? (f.fmv / f.cost).toFixed(1) + 'x' : '—';
      const color = FUND_COLORS[f.type] || '#7c6ff7';
      const badge = f.audited ? '<span style="font-size:9px;background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;padding:1px 5px;border-radius:10px;margin-left:6px">Audited</span>' : '<span style="font-size:9px;background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;padding:1px 5px;border-radius:10px;margin-left:6px">Unaudited</span>';'''

new = '''    cards.innerHTML = funds.map(f => {
      const moic = f.cost > 0 ? (f.fmv / f.cost).toFixed(1) + 'x' : '—';
      const color = FUND_COLORS[f.type] || '#7c6ff7';
      const isEUR = f.currency === 'EUR';
      const sym = isEUR ? '€' : '$';
      const fmtC = (n) => n >= 1e6 ? sym + (n/1e6).toFixed(1) + 'M' : sym + (n/1e3).toFixed(0) + 'K';
      const badge = f.audited ? '<span style="font-size:9px;background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;padding:1px 5px;border-radius:10px;margin-left:6px">Audited</span>' : '<span style="font-size:9px;background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;padding:1px 5px;border-radius:10px;margin-left:6px">Unaudited</span>';
      const eurBadge = isEUR ? '<span style="font-size:9px;background:#60a5fa22;color:#60a5fa;border:1px solid #60a5fa44;padding:1px 5px;border-radius:10px;margin-left:4px">EUR</span>' : '';'''

content = content.replace(old, new, 1)

# Replace fmtM with fmtC for the card FMV/Cost/Unrealized lines (only the 3 card lines)
old2 = '''          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">FMV</span><strong style="color:var(--text)">${fmtM(f.fmv)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Cost</span><span style="color:var(--text-muted)">${fmtM(f.cost)}</span></div>'''
new2 = '''          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">FMV</span><strong style="color:var(--text)">${fmtC(f.fmv)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Cost</span><span style="color:var(--text-muted)">${fmtC(f.cost)}</span></div>'''
content = content.replace(old2, new2, 1)

old3 = '          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Unrealized</span><span style="color:#22c55e">${fmtM(f.unrealized_gain)}</span></div>'
new3 = '          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Unrealized</span><span style="color:#22c55e">${fmtC(f.unrealized_gain)}</span></div>'
content = content.replace(old3, new3, 1)

# Add EUR badge to fund_id line and update Committed line
old4 = '        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:4px">${f.fund_id}${badge}</div>'
new4 = '        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:4px">${f.fund_id}${badge}${eurBadge}</div>'
content = content.replace(old4, new4, 1)

# Update Committed line to use fmtC
old5 = '<span style="color:var(--text-muted)">${fmtM(f.contributed_capital)}</span></div>'
new5 = '<span style="color:var(--text-muted)">${fmtC(f.contributed_capital)}</span></div>'
content = content.replace(old5, new5, 1)

with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'w') as f:
    f.write(content)

print('Done')
