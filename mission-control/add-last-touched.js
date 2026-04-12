const fs = require('fs');
let content = fs.readFileSync('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'utf8');

// Find the description line in renderCompanyCard and insert last_touched after it
const search = "co.description.length>100?'\u2026':''}</div>` : ''}";
const idx = content.indexOf(search);
if (idx > 0) {
  const endOfLine = idx + search.length;
  const insert = "\n      ${co.last_touched ? `<div style=\"font-size:10px;color:var(--text-muted);margin-top:5px\">" +
    "\uD83D\uDD50 ${esc(co.last_touched)}${co.hayley_summary?' \u00b7 \uD83D\uDCF0 news':''}${co.meeting_count>0?' \u00b7 '+co.meeting_count+' mtgs':''}</div>` : ''}";
  content = content.slice(0, endOfLine) + insert + content.slice(endOfLine);
  fs.writeFileSync('/Users/mini/.openclaw/workspace/mission-control/public/index.html', content, 'utf8');
  console.log('Added last_touched + news indicator to company cards');
} else {
  console.log('Pattern not found in file');
}
