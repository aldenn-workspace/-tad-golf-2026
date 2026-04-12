const fs = require('fs');
let c = fs.readFileSync('/Users/mini/.openclaw/workspace/mission-control/public/index.html', 'utf8');

// Find and replace the interactions block to make items expandable
const idx = c.indexOf('MEETINGS & INTERACTIONS');
if (idx < 0) { console.log('Not found'); process.exit(1); }

const blockStart = c.lastIndexOf('${co.interactions', idx);
const blockEnd = c.indexOf("` : ''}", blockStart) + 7;

const newBlock = `\${co.interactions?.length ? \`<div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">📅 MEETINGS & INTERACTIONS (\${co.interactions.length})</div>
      \${co.interactions.map((i,idx) => \`
        <div style="padding:10px 12px;margin-bottom:8px;background:var(--surface2);border-radius:8px;font-size:12px;border:1px solid var(--border2)">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="const d=document.getElementById('int-\${co.id}-'+\${idx});d.style.display=d.style.display==='none'?'block':'none'">
            <div>
              <div style="font-weight:600;color:var(--text)">\${esc(i.title)}</div>
              <div style="color:var(--text-muted);font-size:11px;margin-top:2px">\${i.date} · \${i.type} · \${i.source}</div>
            </div>
            <span style="color:var(--text-muted);font-size:18px;padding:0 4px">›</span>
          </div>
          <div id="int-\${co.id}-\${idx}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--text);line-height:1.7;white-space:pre-wrap">\${esc(i.notes||'No notes available.')}</div>
        </div>
      \`).join('')}
    </div>\` : ''}`;

c = c.substring(0, blockStart) + newBlock + c.substring(blockEnd);
fs.writeFileSync('/Users/mini/.openclaw/workspace/mission-control/public/index.html', c);
console.log('Done - interactions now expandable');
