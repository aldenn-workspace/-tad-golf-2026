const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

// flag emoji helper
const flag = (code) => code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');

const countries = [
  // PVI
  ['PVI', 'WHOOP, Inc.',                   'US', flag('US')],
  ['PVI', 'Bellabeat, Inc.',               'US', flag('US')],
  ['PVI', 'MapBox, Inc.',                  'US', flag('US')],
  ['PVI', 'Opencare, Inc.',                'CA', flag('CA')],
  ['PVI', 'Swift Navigation, Inc.',        'US', flag('US')],
  ['PVI', 'AL-AngelList B-Fund',           'US', flag('US')],
  ['PVI', '500 Startups II, LP',           'US', flag('US')],
  ['PVI', 'Ambition Solutions, Inc.',      'US', flag('US')],
  ['PVI', 'True Fit Corporation',          'US', flag('US')],
  ['PVI', 'Tulip.IO, Inc.',               'US', flag('US')],
  ['PVI', 'AudioDraft Ltd.',              'FI', flag('FI')],
  ['PVI', 'Owner Listens, Inc.',          'US', flag('US')],
  ['PVI', 'Demandbase, Inc.',             'US', flag('US')],
  ['PVI', 'CodersClan Inc.',              'US', flag('US')],
  ['PVI', 'Hermes Topco, LLC',           'US', flag('US')],
  ['PVI', 'Charlie Tango Romeo Holdings','US', flag('US')],
  // PVII
  ['PVII', 'Halter USA, Inc.',            'NZ', flag('NZ')],
  ['PVII', 'ICEYE Oy',                   'FI', flag('FI')],
  ['PVII', 'Rhombus Systems, Inc.',      'US', flag('US')],
  ['PVII', 'StatMuse, Inc.',             'US', flag('US')],
  ['PVII', 'Deako, Inc.',                'US', flag('US')],
  // PVIII
  ['PVIII', 'ICEYE Oy',                  'FI', flag('FI')],
  ['PVIII', 'Rhombus Systems, Inc.',     'US', flag('US')],
  ['PVIII', 'Chef Robotics, Inc.',       'US', flag('US')],
  ['PVIII', 'Chef Robotics',             'US', flag('US')],
  ['PVIII', 'Safehub, Inc.',             'US', flag('US')],
  ['PVIII', 'Foundry Lab, Inc.',         'NZ', flag('NZ')],
  ['PVIII', 'Foundry Lab',               'NZ', flag('NZ')],
  ['PVIII', 'Earth AI Inc.',             'AU', flag('AU')],
  ['PVIII', 'Earth AI',                  'AU', flag('AU')],
  ['PVIII', 'Arch Systems, Inc.',        'US', flag('US')],
  ['PVIII', 'Arch Systems',              'US', flag('US')],
  ['PVIII', 'Biocogniv Inc.',            'US', flag('US')],
  ['PVIII', 'Diligent Robotics, Inc.',   'US', flag('US')],
  ['PVIII', 'SkyCurrent, LLC',           'US', flag('US')],
  ['PVIII', 'The Expert Inc.',           'US', flag('US')],
  ['PVIII', 'Orbital Ventures S.C.A.',   'LU', flag('LU')],
  // PVE
  ['PVE', 'WHOOP, Inc.',                 'US', flag('US')],
  ['PVE', 'MapBox, Inc.',                'US', flag('US')],
  ['PVE', 'FLYR, Inc.',                  'US', flag('US')],
  ['PVE', 'Opencare, Inc.',              'CA', flag('CA')],
  ['PVE', 'True Fit Corporation',        'US', flag('US')],
  ['PVE', 'Hermes Topco, LLC',          'US', flag('US')],
  // SPVs
  ['PVMHalter', 'Halter USA, Inc.',      'NZ', flag('NZ')],
  ['PVWhoop',   'WHOOP, Inc.',           'US', flag('US')],
  ['PVMChef',   'Chef Robotics',         'US', flag('US')],
  ['PVRocketLab','Rocket Lab USA',       'US', flag('US')],
  // OVI — from SOI country column
  ['OVI', 'SeerAI',                              'US', flag('US')],
  ['OVI', 'Akasha Imaging (Vicarious)',           'US', flag('US')],
  ['OVI', 'ALL.SPACE',                           'GB', flag('GB')],
  ['OVI', 'Ellipsis Drive',                      'NL', flag('NL')],
  ['OVI', 'Wakeo',                               'FR', flag('FR')],
  ['OVI', 'Recycleye',                           'GB', flag('GB')],
  ['OVI', 'Fernride',                            'DE', flag('DE')],
  ['OVI', 'The Exploration Company',             'DE', flag('DE')],
  ['OVI', 'Mangata Networks',                    'US', flag('US')],
  ['OVI', 'Vayu Robotics',                       'US', flag('US')],
  ['OVI', 'Lunasonde',                           'US', flag('US')],
  ['OVI', 'Lunar Outpost',                       'US', flag('US')],
  ['OVI', 'Jua',                                 'DE', flag('DE')],
  ['OVI', 'RobCo',                               'DE', flag('DE')],
  ['OVI', 'SatSure',                             'IN', flag('IN')],
  ['OVI', 'Mytra',                               'US', flag('US')],
  ['OVI', 'Encube',                              'CH', flag('CH')],
  ['OVI', 'SAMP',                                'FR', flag('FR')],
  ['OVI', 'Uplift360 Europe',                    'LU', flag('LU')],
  ['OVI', 'Capra Robotics',                      'DK', flag('DK')],
];

const upd = db.prepare('UPDATE portfolio_holdings SET country=? WHERE fund_id=? AND company=?');
let updated = 0;
countries.forEach(([fund, company, code, emoji]) => {
  const r = upd.run(emoji + ' ' + code, fund, company);
  if (r.changes) updated++;
});
console.log('Updated:', updated, 'of', countries.length);

// Check any still missing
const missing = db.prepare("SELECT fund_id, company FROM portfolio_holdings WHERE country='' OR country IS NULL").all();
if (missing.length) { console.log('\nStill missing:'); missing.forEach(m => console.log(' ', m.fund_id, m.company)); }
else console.log('All covered!');
