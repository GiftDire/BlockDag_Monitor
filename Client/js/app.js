// -------------------- config --------------------
const API_BASE = "http://localhost:8080"; // change to your deployed URL later

// -------------------- utils --------------------
const $ = (sel) => document.querySelector(sel);
const fmt = (ts) =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// -------------------- elements --------------------
const logInput     = $("#logInput");
const ingestBtn    = $("#ingestBtn");
const refreshBtn   = $("#refreshBtn");
const list         = $("#summaryList");
const searchBtn    = $("#searchBtn");
const searchId     = $("#searchId");
const searchResult = $("#searchResult");

// -------------------- preload sample --------------------
if (logInput) {
  logInput.value = `# FROM: node-7
TYPE: BLOCK
PARENTS: []
TIMESTAMP: 2025-08-07T09:13:12Z
PAYLOAD: mint tx { from: A, to: B, amount: 100 }
---
# FROM: node-2
TYPE: BLOCK
PARENTS: [BDG-001]
TIMESTAMP: 2025-08-07T09:13:27Z
PAYLOAD: tx { from: B, to: C, amount: 40 }
---
# FROM: node-9
TYPE: GOSSIP
TIMESTAMP: 2025-08-07T09:13:32Z
PAYLOAD: heard about BDG-002`;
}

// -------------------- render helpers --------------------
function renderBlockDetail(b, gossips = []) {
  const parents =
    (b.parents || []).map((p) => p.parentId).join(", ") || "— (genesis)";
  const g =
    gossips.length > 0
      ? gossips
          .map(
            (g) =>
              `• ${g.fromNode} @ ${fmt(g.timestamp)} — ${g.aboutId ?? "—"}`
          )
          .join("<br>")
      : "—";

  return `
    <div class="rounded-xl border border-slate-700 p-4">
      <div class="font-semibold">${b.id}</div>
      <div class="text-sm text-slate-400">${fmt(b.timestamp)}</div>
      <div class="mt-1">Parents: ${parents}</div>
      <div class="mt-2">
        <div class="text-slate-400">Gossips:</div>
        <div>${g}</div>
      </div>
    </div>`;
}

function renderSummaryItem(b) {
  const parents = b.parents?.length ? b.parents.join(", ") : "— (genesis)";
  const gList = (b.gossips || [])
    .map(
      (g) =>
        `<li>${g.fromNode} @ ${new Date(g.timestamp).toLocaleTimeString()} — ${
          g.aboutId ?? "—"
        }</li>`
    )
    .join("");
  const gHtml = gList
    ? `<div class="mt-2 text-xs opacity-80">
         <div class="mb-1">Gossips:</div>
         <ul class="list-disc pl-5">${gList}</ul>
       </div>`
    : "";

  return `
    <div class="font-mono text-sm">${b.id}</div>
    <div class="text-xs opacity-70">${fmt(b.timestamp)}</div>
    <div class="text-xs">Parents: ${parents}</div>
    ${gHtml}
  `;
}

// -------------------- actions --------------------
async function loadSummary() {
  try {
    const r = await fetch(`${API_BASE}/api/summary`);
    if (!r.ok) throw new Error("summary failed");
    const summary = await r.json();

    list.innerHTML = "";
    summary.forEach((b) => {
      const li = document.createElement("li");
      li.className = "p-3 hover:bg-slate-900";
      li.innerHTML = renderSummaryItem(b);
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML =
      '<li class="p-3 text-red-400">Failed to load summary.</li>';
  }
}

async function ingest() {
  const log = (logInput?.value || "").trim();
  if (!log) {
    alert("Paste a log first.");
    return;
  }
  try {
    const r = await fetch(`${API_BASE}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log }),
    });
    if (!r.ok) throw new Error("ingest failed");
    await loadSummary();
  } catch (err) {
    console.error(err);
    alert("Ingest failed. See console for details.");
  }
}

async function lookup() {
  const id = (searchId?.value || "").trim();
  if (!id) return;
  try {
    const r = await fetch(
      `${API_BASE}/api/blocks/${encodeURIComponent(id)}`
    );
    if (!r.ok) {
      searchResult.innerHTML =
        '<p class="text-red-400">Block not found.</p>';
      return;
    }
    const { block, gossips } = await r.json();
    searchResult.innerHTML = renderBlockDetail(block, gossips);
  } catch (err) {
    console.error(err);
    searchResult.innerHTML =
      '<p class="text-red-400">Lookup failed.</p>';
  }
}

// -------------------- listeners --------------------
if (ingestBtn) ingestBtn.addEventListener("click", ingest);
if (refreshBtn) refreshBtn.addEventListener("click", loadSummary);
if (searchBtn) {
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    lookup();
  });
}

// -------------------- initial load --------------------
loadSummary();
