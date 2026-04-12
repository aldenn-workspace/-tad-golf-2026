'use strict';

/**
 * Affinity CRM API Client
 * Docs: https://api-docs.affinity.co/
 */

const BASE_URL = 'https://api.affinity.co';

class AffinityClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.AFFINITY_API_KEY;
    if (!this.apiKey) {
      throw new Error('AFFINITY_API_KEY not set');
    }
    // Affinity uses Basic auth: empty username, API key as password
    this.auth = Buffer.from(`:${this.apiKey}`).toString('base64');
  }

  async _request(method, path, body) {
    const url = `${BASE_URL}${path}`;
    const opts = {
      method,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Affinity API ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ── Organizations (Companies) ───────────────────────────────────────────────
  async searchOrganizations(term, { limit=25 } = {}) {
    const qs = new URLSearchParams({ term, page_size: limit });
    return this._request('GET', `/organizations?${qs}`);
  }

  async getOrganization(id) {
    return this._request('GET', `/organizations/${id}`);
  }

  async createOrganization({ name, domain, fields = {} }) {
    return this._request('POST', '/organizations', { name, domain, ...fields });
  }

  async updateOrganization(id, data) {
    return this._request('PUT', `/organizations/${id}`, data);
  }

  // ── Persons ────────────────────────────────────────────────────────────────
  async searchPersons(term, { limit=25 } = {}) {
    const qs = new URLSearchParams({ term, page_size: limit });
    return this._request('GET', `/persons?${qs}`);
  }

  async getPerson(id) {
    return this._request('GET', `/persons/${id}`);
  }

  // ── Lists ──────────────────────────────────────────────────────────────────
  async getLists() {
    return this._request('GET', '/lists');
  }

  async getList(listId) {
    return this._request('GET', `/lists/${listId}`);
  }

  async getListEntries(listId, { page_size=500, page_token } = {}) {
    const qs = new URLSearchParams({ page_size });
    if (page_token) qs.set('page_token', page_token);
    return this._request('GET', `/lists/${listId}/list-entries?${qs}`);
  }

  async getAllListEntries(listId) {
    const entries = [];
    let page_token;
    do {
      const res = await this.getListEntries(listId, { page_token });
      if (res.list_entries) entries.push(...res.list_entries);
      page_token = res.next_page_token;
    } while (page_token);
    return entries;
  }

  async createListEntry(listId, entityId) {
    return this._request('POST', `/lists/${listId}/list-entries`, { entity_id: entityId });
  }

  async deleteListEntry(listId, listEntryId) {
    return this._request('DELETE', `/lists/${listId}/list-entries/${listEntryId}`);
  }

  // ── Field Values ───────────────────────────────────────────────────────────
  async getFieldValues(entityId, { list_entry_id } = {}) {
    const qs = new URLSearchParams({ organization_id: entityId });
    if (list_entry_id) qs.set('list_entry_id', list_entry_id);
    return this._request('GET', `/field-values?${qs}`);
  }

  async setFieldValue(fieldId, entityId, value, listEntryId) {
    const body = { field_id: fieldId, entity_id: entityId, value };
    if (listEntryId) body.list_entry_id = listEntryId;
    return this._request('POST', '/field-values', body);
  }

  async updateFieldValue(fieldValueId, value) {
    return this._request('PUT', `/field-values/${fieldValueId}`, { value });
  }

  // ── Fields (metadata) ──────────────────────────────────────────────────────
  async getFields(listId) {
    const qs = listId ? `?list_id=${listId}` : '';
    return this._request('GET', `/fields${qs}`);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  async getNotes(organizationId, { limit=25 } = {}) {
    const qs = new URLSearchParams({ organization_id: organizationId, page_size: limit });
    return this._request('GET', `/notes?${qs}`);
  }

  async createNote({ organizationId, personId, content, createdAt }) {
    const body = { content };
    if (organizationId) body.organization_id = organizationId;
    if (personId) body.person_id = personId;
    if (createdAt) body.created_at = createdAt;
    return this._request('POST', '/notes', body);
  }

  // ── Interactions ───────────────────────────────────────────────────────────
  async getInteractions(organizationId) {
    const qs = new URLSearchParams({ organization_id: organizationId });
    return this._request('GET', `/interactions?${qs}`);
  }

  // ── Opportunities ──────────────────────────────────────────────────────────
  async getOpportunities(listId) {
    return this._request('GET', `/opportunities?list_id=${listId}`);
  }
}

module.exports = AffinityClient;
