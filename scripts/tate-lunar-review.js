const { tateMultiDocReview, extractPdfText } = require('/Users/mini/.openclaw/workspace/mission-control/tate-legal');

const BASE = '/Users/mini/.openclaw/workspace/legal-docs/lunar-outpost/';
const DOCS = [
  { name: 'A&R Investors Rights Agreement', file: 'ira.pdf' },
  { name: 'A&R ROFR and Co-Sale Agreement', file: 'rofr.pdf' },
  { name: 'A&R Voting Agreement', file: 'voting.pdf' },
  { name: 'Restated Certificate of Incorporation', file: 'cert.pdf' },
];

const QUESTIONS = `Please answer the following questions precisely, citing the specific document name and section/clause for each answer:

1. PRO-RATA RIGHTS: How do Promus Ventures' pro-rata rights work? What is the mechanics — what round does it apply to, what is the basis for calculating our allocation, any notice periods or deadlines?

2. SUPER PRO-RATA RIGHTS: Do we have super pro-rata rights? If so, how do they work and what are the conditions?

3. RIGHT OF FIRST REFUSAL ON SECONDARIES: What are our ROFR rights when the company or existing shareholders want to sell shares in a secondary transaction? Who has the right, what is the process, any time limits?

4. BOARD VETO TO PREVENT REMOVAL: If Promus Ventures were asked to leave the board, do we have any veto right or protective provision to block or prevent this? What exactly does the document say about board composition and removal rights?`;

async function run() {
  console.log('Tate reading', DOCS.length, 'documents...\n');
  const docs = await Promise.all(DOCS.map(async (doc) => {
    try {
      const text = await extractPdfText(BASE + doc.file);
      console.log('✓', doc.name, '—', text.length, 'chars');
      return { name: doc.name, text, filePath: BASE + doc.file };
    } catch(e) {
      console.log('✗', doc.name, '— ERROR:', e.message);
      return { name: doc.name, text: '', filePath: BASE + doc.file };
    }
  }));

  console.log('\nAsking Tate your questions...\n');
  const answer = await tateMultiDocReview(docs, QUESTIONS);
  console.log('='.repeat(60));
  console.log(answer);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
