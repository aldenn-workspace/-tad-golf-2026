const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS portfolio_subpositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id TEXT NOT NULL,
    company TEXT NOT NULL,
    date TEXT,
    round TEXT,
    shares REAL DEFAULT 0,
    cost_per_share REAL DEFAULT 0,
    fmv_per_share REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    fair_value REAL DEFAULT 0,
    unrealized_gain REAL DEFAULT 0,
    change_in_fv REAL DEFAULT 0,
    comments TEXT DEFAULT '',
    as_of TEXT DEFAULT '2025-12-31'
  );
`);

db.prepare('DELETE FROM portfolio_subpositions').run();

const ins = db.prepare(`INSERT INTO portfolio_subpositions
  (fund_id, company, date, round, shares, cost_per_share, fmv_per_share, cost, fair_value, unrealized_gain, change_in_fv, comments)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const rows = [
  // PVI — WHOOP
  ['PVI','WHOOP, Inc.','2013-07-30','Series Seed Preferred',3938790,0.0889,11.3,350001,44508327,44158326,25765989,'Marked to Series G'],
  ['PVI','WHOOP, Inc.','2014-06-05','Series A Preferred',5628100,0.1333,11.3,750001,63597530,62847529,36816779,''],
  ['PVI','WHOOP, Inc.','2015-09-09','Series B Preferred',1373630,0.1820,11.3,250001,15522019,15272018,8985738,''],
  ['PVI','WHOOP, Inc.','2019-10-29','Series D Preferred',230900,0.4331,11.3,100002,2609170,2509168,1510455,''],
  ['PVI','WHOOP, Inc.','2020-10-27','Series E Preferred',54240,1.8436,11.3,99995,612912,512917,354818,''],
  // PVI — Bellabeat
  ['PVI','Bellabeat, Inc.','2014-04-23','Series A-4 Preferred',609681,0.8201,25.168,500000,15344543,14844543,-2192078,'Q4 25 Additional 10% discount'],
  // PVI — MapBox
  ['PVI','MapBox, Inc.','2015-06-05','Series B Preferred',20354,8.5979,33.14,175002,674532,499530,0,''],
  // PVI — Opencare (multi-round)
  ['PVI','Opencare, Inc.','2015-08-24','Series Seed B Preferred',174441,2.8663,6.4801,500000,1130395,630395,0,''],
  ['PVI','Opencare, Inc.','2018-03-16','Series A-2 Preferred',16394,9.7537,6.4801,159902,106235,-53667,0,''],
  ['PVI','Opencare, Inc.','2020-04-27','Series A-3 Preferred',24683,6.4801,6.4801,159948,159948,0,0,''],
  ['PVI','Opencare, Inc.','2020-04-09','Ser 2 Common Warrant',37024,0,0.9,0,33322,33322,0,''],
  ['PVI','Opencare, Inc.','2023-05-11','Convertible Note',0,0,0,30278,30278,0,0,''],
  ['PVI','Opencare, Inc.','2024-01-19','Convertible Note',0,0,0,30278,30278,0,0,''],
  ['PVI','Opencare, Inc.','2024-06-30','Convertible Note',0,0,0,30278,30278,0,0,''],
  // PVI — Swift Navigation
  ['PVI','Swift Navigation, Inc.','2015-08-12','Series A Preferred',365416,1.3683,1.3507,499999,493568,-6431,0,'Series E Round Oct 2024'],
  // PVI — AL-AngelList
  ['PVI','AL-AngelList B-Fund','2013-06-18','Series B Preferred Units',93580,1.0686,15.633,100000,1462937,1362937,3713,''],
  // PVI — 500 Startups
  ['PVI','500 Startups II, LP','2013-01-31','Membership Interest',42671,0,13.4947,0,575834,575834,63531,'Per Q3 25 PCAP'],
  // PVI — Ambition Solutions
  ['PVI','Ambition Solutions, Inc.','2014-05-22','Series A Preferred',63291,3.9500,10.6,250000,670885,420885,0,''],
  // PVI — True Fit (zeroed out)
  ['PVI','True Fit Corporation','2014-09-26','Common',39830,25.1066,0,1000000,0,-1000000,0,'Q3 25 Reverse Stock Split'],
  ['PVI','True Fit Corporation','2016-01-05','Common',8174,61.1707,0,500000,0,-500000,0,'Q3 25 Reverse Stock Split'],
  ['PVI','True Fit Corporation','2021-09-24','Common',3164,62.9394,0,199159,0,-199159,0,'Q3 25 Reverse Stock Split'],
  // PVI — Tulip.IO
  ['PVI','Tulip.IO, Inc.','2013-08-07','Common',100516,3.4820,0.56,350000,56289,-293711,0,''],
  ['PVI','Tulip.IO, Inc.','2014-05-07','Common',28719,3.4820,0.56,100000,16083,-83917,0,''],
  ['PVI','Tulip.IO, Inc.','2015-05-13','Common',18012,2.9382,0.56,52922,10087,-42835,0,''],
  ['PVI','Tulip.IO, Inc.','2016-02-29','Common',54454,3.6728,0.56,199999,30494,-169505,0,''],

  // PVII — Halter USA
  ['PVII','Halter USA, Inc.','2017-07-27','Series A Preferred',2025767,0.2468,40.1411,500000,81316516,80816516,36140696,'FMV marked to Series E'],
  ['PVII','Halter USA, Inc.','2018-05-02','Series A-1 Preferred',506832,1.7278,40.1411,875705,20344794,19469089,9042136,''],
  ['PVII','Halter USA, Inc.','2019-05-24','Series B2 Preferred',486015,2.7562,40.1411,1339552,19509177,18169625,8670751,''],
  ['PVII','Halter USA, Inc.','2021-02-03','Series B1 Preferred',246717,3.6124,40.1411,891240,9903492,9012252,4401555,''],
  // PVII — ICEYE
  ['PVII','ICEYE Oy','2018-05-02','Series B Preferred',86567,1.6411,21.0323,142062,1820706,1678644,-1288390,''],
  ['PVII','ICEYE Oy','2019-12-16','Series C Preferred',37461,4.2726,21.0323,160054,787891,627837,-3190,''],
  ['PVII','ICEYE Oy','2021-12-17','Series D Preferred',29443,8.4909,21.0323,249998,619254,369256,-2507,''],
  // PVII — Rhombus
  ['PVII','Rhombus Systems, Inc.','2018-05-01','Series Seed-1 Preferred',284705,0.8781,8.8555,249999,2521205,2271206,0,'FMV marked to Series C'],
  // PVII — StatMuse
  ['PVII','StatMuse, Inc.','2016-01-06','Series A Preferred',282262,1.7714,7.6182,500000,2150317,1650317,-537579,'Q4 25 - 20% discount'],
  // PVII — Deako
  ['PVII','Deako, Inc.','2016-06-13','Series Seed Preferred',636213,0.7859,0.3502,500000,222802,-277198,0,''],
  ['PVII','Deako, Inc.','2017-09-06','Series A Preferred',1386725,0.1840,0.3502,255158,485631,230473,0,''],
  ['PVII','Deako, Inc.','2019-02-06','Series B Preferred',392547,0.1827,0.3502,71733,137471,65738,0,''],

  // PVIII — ICEYE
  ['PVIII','ICEYE Oy','2018-05-02','Series B Preferred',277366,1.6411,21.0323,455176,5833646,5378470,-3522625,''],
  ['PVIII','ICEYE Oy','2019-12-16','Series C Preferred',112383,4.2726,21.0323,480164,2363674,1883510,-9568,''],
  ['PVIII','ICEYE Oy','2021-12-06','Series D Preferred',29443,8.4909,21.0323,249998,619254,369256,-2507,''],
  // PVIII — Rhombus
  ['PVIII','Rhombus Systems, Inc.','2018-05-02','Series Seed-1 Preferred',284705,0.8781,8.8555,250000,2521205,2271205,0,'Marked to Series C'],
  ['PVIII','Rhombus Systems, Inc.','2019-02-22','Series Seed-4 Preferred',208130,1.2219,8.8555,254315,1843095,1588780,0,''],
  ['PVIII','Rhombus Systems, Inc.','2020-04-02','Series Seed-4 Preferred',44440,1.2219,8.8555,54302,393538,339236,0,''],
  ['PVIII','Rhombus Systems, Inc.','2021-09-23','Series A Preferred',19867,2.5166,8.8555,49998,175932,125934,0,''],
  // PVIII — Chef Robotics
  ['PVIII','Chef Robotics, Inc.','2021-02-10','Series Seed-2 Preferred',936193,1.1002,2.7622,1030000,2585954,1555954,0,''],
  ['PVIII','Chef Robotics, Inc.','2023-03-31','Series A-4 (From Conv)',77742,1.7046,2.7622,132521,214739,82218,0,''],
  ['PVIII','Chef Robotics, Inc.','2023-05-17','Series A-4 (From Conv)',77405,1.7046,2.7622,131945,213808,81863,0,''],
  ['PVIII','Chef Robotics, Inc.','2024-11-06','Series A Preferred',36203,2.7622,2.7622,100000,100000,0,0,''],
  // PVIII — Safehub
  ['PVIII','Safehub, Inc.','2019-11-26','Series Seed-1 Preferred',939143,0.5324,0.7321,500000,687547,187547,0,''],
  ['PVIII','Safehub, Inc.','2020-08-27','Series A-2 Preferred',1734723,0.5857,0.7321,1016026,1269991,253965,0,''],
  // PVIII — Foundry Lab
  ['PVIII','Foundry Lab, Inc.','2020-03-02','Series A Preferred',113652,6.5990,10.1925,749994,1158398,408404,0,'Mark to Series A-1/A-2'],
  ['PVIII','Foundry Lab, Inc.','2021-08-20','Series A-2 Preferred',13553,36.8899,10.1925,499969,138139,-361830,0,''],
  // PVIII — Earth AI
  ['PVIII','Earth AI Inc.','2019-09-16','Series A-1',527259,0.9483,1.2247,500000,645734,145734,0,''],
  // PVIII — Arch Systems
  ['PVIII','Arch Systems, Inc.','2018-09-21','Series A Preferred',229053,2.1829,2.9133,500000,667300,167300,0,''],
  // PVIII — Biocogniv
  ['PVIII','Biocogniv Inc.','2020-09-05','Series Seed-4 Preferred',254447,0.9825,1.3100,250000,333334,83334,0,''],
  ['PVIII','Biocogniv Inc.','2022-02-01','Series Seed-5 Preferred',190835,1.3100,1.3100,250000,250000,0,0,''],

  // PVE — WHOOP
  ['PVE','WHOOP, Inc.','2017-03-22','Series C Preferred',475420,0.2256,11.3,107255,5372246,5264991,3110007,'Marked to Series G'],
  ['PVE','WHOOP, Inc.','2020-10-27','Series E Preferred',54240,1.8436,11.3,99995,612912,512917,354816,''],
  // PVE — MapBox
  ['PVE','MapBox, Inc.','2015-06-05','Series B Preferred',61061,8.5979,33.14,524997,2023562,1498565,0,''],
  // PVE — FLYR
  ['PVE','FLYR, Inc.','2021-09-24','Series D-1',280477,7.1307,7.1307,2000000,2000000,0,0,''],
  ['PVE','FLYR, Inc.','2024-02-21','Series D-1',20337,7.1307,7.1307,145017,145017,0,0,''],
  // PVE — Opencare
  ['PVE','Opencare, Inc.','2018-03-16','Series A-2 Preferred',10253,9.7537,6.4801,100005,66440,-33565,0,''],
  ['PVE','Opencare, Inc.','2020-04-27','Series A-3 Preferred',1325,6.48,6.4801,8586,8586,0,0,''],
  ['PVE','Opencare, Inc.','2020-04-09','Ser 2 Common Warrant',1987,0,0.9,0,1788,1788,0,''],
  ['PVE','Opencare, Inc.','2023-04-13','Convertible Note',0,0,0,1627,1627,0,0,''],
  ['PVE','Opencare, Inc.','2024-01-24','Convertible Note',0,0,0,1627,1627,0,0,''],
  ['PVE','Opencare, Inc.','2024-06-30','Convertible Note',0,0,0,1627,1627,0,0,''],

  // PVM Halter — sub-tranches
  ['PVMHalter','Halter USA, Inc.','2019-05-24','Series B2 Preferred',438366,2.7562,40.1411,1208225,17596493,16388268,7820668,'Tranche 1'],
  ['PVMHalter','Halter USA, Inc.','2021-02-03','Series B1 Preferred',1017329,3.6124,40.1411,3674999,40836705,37161706,18149658,'Tranche 2'],
  ['PVMHalter','Halter USA, Inc.','2022-11-18','Series C Preferred',166196,7.9454,40.1411,1320494,6671290,5350796,2965019,'Tranche 3'],
  ['PVMHalter','Halter USA, Inc.','2025-06-13','Series D Preferred',168156,22.3006,40.1411,3749980,6749967,2999987,0,'Tranche 4'],

  // PV Whoop — single position
  ['PVWhoop','WHOOP, Inc.','2020-10-27','Series E Preferred',759420,1.8436,11.3,1400059,8581446,7181387,4967822,''],

  // PVM Chef — single position
  ['PVMChef','Chef Robotics','2024-11-06','Series A Preferred',307725,2.7622,2.7622,849998,849998,0,0,'At cost'],
];

rows.forEach(r => ins.run(...r));
console.log('Loaded', rows.length, 'sub-positions');
