const fs = require('fs');
let c = fs.readFileSync('/Users/mini/.openclaw/workspace/mission-control/serve.js', 'utf8');

// Remove broken block
const broken = c.indexOf('const rawInteractions');
const end = c.indexOf('return i;\n  });', broken) + 16;

const fixed = `const rawInteractions = db.prepare('SELECT * FROM interactions WHERE company_id = ? ORDER BY date DESC').all(co.id);
  const interactions = rawInteractions.map(i => {
    if (i.source === 'riley' && i.source_id) {
      try {
        const rn = db.prepare('SELECT summary, raw_summary, action_items, attendees FROM riley_notes WHERE id = ?').get(i.source_id);
        if (rn) {
          const parts = [];
          if (rn.summary) parts.push('Summary: ' + rn.summary);
          if (rn.attendees) parts.push('Attendees: ' + rn.attendees);
          try {
            const actions = JSON.parse(rn.action_items || '[]');
            if (actions.length) parts.push('Action Items: ' + actions.join(' | '));
          } catch(e2) {}
          if (rn.raw_summary) parts.push('Full Notes: ' + rn.raw_summary.substring(0, 2000));
          return Object.assign({}, i, { notes: parts.join(' -- ') || i.notes });
        }
      } catch(e) {}
    }
    return i;
  });`;

if (broken > 0) {
  c = c.substring(0, broken) + fixed + c.substring(end);
  fs.writeFileSync('/Users/mini/.openclaw/workspace/mission-control/serve.js', c);
  console.log('Fixed riley notes enrichment');
} else {
  console.log('Block not found');
}
