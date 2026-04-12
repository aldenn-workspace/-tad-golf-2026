'use strict';

/**
 * Email sync for newdeals@promusventures.com via Microsoft Graph / MSAL
 * Config: /Users/mini/.openclaw/workspace/deal-intake-outlook-config.json
 */

const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join('/Users/mini/.openclaw/workspace', 'deal-intake-outlook-config.json');

async function getAccessToken(config) {
  const { ConfidentialClientApplication } = require('@azure/msal-node');
  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    },
  };
  const cca = new ConfidentialClientApplication(msalConfig);
  const result = await cca.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  return result.accessToken;
}

async function fetchEmails(accessToken, userEmail, { top=25, skip=0 } = {}) {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/mailFolders/Inbox/messages?$top=${top}&$skip=${skip}&$select=id,subject,from,toRecipients,receivedDateTime,body,bodyPreview&$orderby=receivedDateTime desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function syncEmail(db) {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Outlook config not found at ${CONFIG_PATH}`);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const userEmail = config.email || 'newdeals@promusventures.com';

  const token = await getAccessToken(config);
  const data = await fetchEmails(token, userEmail, { top: 50 });
  const messages = data.value || [];

  let inserted = 0;
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO incoming_deals
      (deal_name, source_email, source_channel, inbound_type, intake_date, notes, status, email_content)
    VALUES (?, ?, ?, ?, ?, ?, 'new', ?)
  `);

  for (const msg of messages) {
    const subject = msg.subject || '(no subject)';
    const fromEmail = msg.from?.emailAddress?.address || '';
    const body = msg.bodyPreview || '';
    const fullBody = msg.body?.content || body;
    const date = msg.receivedDateTime ? msg.receivedDateTime.split('T')[0] : new Date().toISOString().split('T')[0];

    // Only import deal-looking emails
    insertStmt.run(
      subject,
      fromEmail,
      'email',
      'Inbound Email',
      date,
      body.substring(0, 500),
      fullBody.substring(0, 5000)
    );
    inserted++;
  }

  return inserted;
}

module.exports = syncEmail;
