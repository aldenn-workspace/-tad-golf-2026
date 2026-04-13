'use strict';

/**
 * Tate — Legal Review Agent
 * Reads PDFs, analyzes with Claude, answers specific legal questions
 */

const fs = require('fs');
const path = require('path');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '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';

async function extractPdfText(filePath) {
  try {
    const { execSync } = require('child_process');
    const escaped = filePath.replace(/'/g, "'\\''");
    const text = execSync(`python3 -c "from pdfminer.high_level import extract_text; print(extract_text('${escaped}'))"`, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }).toString();
    if (!text || text.trim().length < 20) throw new Error('Empty text extracted');
    return text;
  } catch (e) {
    throw new Error('PDF extraction failed: ' + e.message);
  }
}

async function callClaude(prompt, maxTokens = 3000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Claude API error');
  return json.content[0].text;
}

/**
 * Review a single document
 * @param {string} docName - display name
 * @param {string} docText - raw text (or null to extract from filePath)
 * @param {string} filePath - path to PDF (optional)
 * @param {string} questions - specific questions to answer (optional)
 */
async function tateLegalReview(docName, docText, filePath, questions) {
  // Extract PDF text if needed
  if ((!docText || docText.startsWith('[PDF uploaded')) && filePath && fs.existsSync(filePath)) {
    docText = await extractPdfText(filePath);
  }

  if (!docText || docText.length < 50) {
    return `Tate could not read "${docName}" — no text content available. Please ensure the PDF is uploaded and readable.`;
  }

  const prompt = questions
    ? `You are Tate, a legal review agent for Promus Ventures, a VC firm. You are reviewing legal documents on behalf of Mike Collett (Managing Partner).

Document: ${docName}

Specific questions to answer:
${questions}

Be precise and cite specific sections/clauses where possible. Flag anything unusual or concerning.

DOCUMENT TEXT:
${docText.slice(0, 50000)}`
    : `You are Tate, a legal review agent for Promus Ventures, a VC firm. You are reviewing legal documents on behalf of Mike Collett (Managing Partner).

Document: ${docName}

Provide a structured review covering:
1. Document type and purpose
2. Key economic terms (liquidation preference, anti-dilution, pro-rata rights)
3. Governance rights (board seats, voting, protective provisions)
4. Transfer restrictions & ROFR
5. Information rights
6. Red flags or unusual terms
7. Summary assessment

Be precise and cite specific sections/clauses where possible.

DOCUMENT TEXT:
${docText.slice(0, 50000)}`;

  return await callClaude(prompt);
}

/**
 * Answer questions across multiple documents
 * @param {Array} docs - array of {name, text, filePath}
 * @param {string} questions - questions to answer
 */
async function tateMultiDocReview(docs, questions) {
  const docTexts = await Promise.all(docs.map(async (doc) => {
    let text = doc.text;
    if ((!text || text.startsWith('[PDF uploaded')) && doc.filePath && fs.existsSync(doc.filePath)) {
      try { text = await extractPdfText(doc.filePath); } catch(e) { text = '[Could not read PDF]'; }
    }
    return `=== ${doc.name} ===\n${(text || '[No content]').slice(0, 20000)}`;
  }));

  const prompt = `You are Tate, a legal review agent for Promus Ventures. You are reviewing multiple legal documents on behalf of Mike Collett (Managing Partner).

Questions to answer:
${questions}

For each answer, cite which document and specific section the answer comes from. Be precise. Flag anything unclear or missing.

DOCUMENTS:
${docTexts.join('\n\n')}`;

  return await callClaude(prompt, 4000);
}

module.exports = { tateLegalReview, tateMultiDocReview, extractPdfText };
