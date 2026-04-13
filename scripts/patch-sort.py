with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'r') as f:
    content = f.read()

old = """          const noSort = ['_moic','_pct_fund'].includes(c.key);
          return `<th ${noSort ? '' : `onclick="sortPortfolio('${c.key}')"`} style="${noSort?'':'cursor:pointer;user-select:none;'}padding:8px 10px;text-align:left;font-size:10px;color:${active?'var(--accent)':'var(--text-muted)'};font-weight:700;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid var(--border)">${c.label}${arrow}</th>`;"""

new = """          return `<th onclick="sortPortfolio('${c.key}')" style="cursor:pointer;user-select:none;padding:8px 10px;text-align:left;font-size:10px;color:${active?'var(--accent)':'var(--text-muted)'};font-weight:700;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid var(--border)">${c.label}${arrow}</th>`;"""

if old in content:
    content = content.replace(old, new, 1)
    print('Replaced noSort block')
else:
    print('NOT FOUND — checking nearby...')
    idx = content.find("const noSort")
    print(repr(content[idx:idx+300]))

with open('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'w') as f:
    f.write(content)
