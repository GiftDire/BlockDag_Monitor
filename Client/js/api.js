// Simple API helper used by other pages
(() => {
  const API_BASE = window.API_BASE ?? `${location.protocol}//${location.host}`;

  async function jsonFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
    return res.json();
  }

  async function ingestLog(log) {
    return jsonFetch(`/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log }),
    });
  }

  async function getSummary() {
    return jsonFetch(`/api/summary`);
  }

  async function getBlock(id) {
    return jsonFetch(`/api/blocks/${encodeURIComponent(id)}`);
  }

  async function getBlocks() {
    return jsonFetch(`/api/blocks`);
  }

  window.API = { ingestLog, getSummary, getBlock, getBlocks, API_BASE };
})();
