const API_BASE = "http://localhost:8080"; // change to your deployed URL later

const logInput = document.getElementById("logInput");
const ingestBtn = document.getElementById("ingestBtn");
const refreshBtn = document.getElementById("refreshBtn");
const list = document.getElementById("summaryList");

// optional: preload the same sample used in seed
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

ingestBtn.addEventListener("click", async () => {
  const log = logInput.value.trim();
  if (!log) return alert("Paste a log first.");
  await fetch(`${API_BASE}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log }),
  });
  await loadSummary();
});

refreshBtn.addEventListener("click", loadSummary);

async function loadSummary() {
  const summary = await fetch(`${API_BASE}/api/summary`).then(r => r.json());
  list.innerHTML = "";
  summary.forEach(b => {
    const li = document.createElement("li");
    li.className = "p-3 hover:bg-slate-900";
    li.innerHTML = `
      <div class="font-mono text-sm">${b.id}</div>
      <div class="text-xs opacity-70">${new Date(b.timestamp).toLocaleString()}</div>
      <div class="text-xs">Parents: ${b.parents.length ? b.parents.join(", ") : "— (genesis)"}</div>
      ${
        b.gossips?.length
          ? `<div class="mt-2 text-xs opacity-80">
               <div class="mb-1">Gossips:</div>
               <ul class="list-disc pl-5">
                 ${b.gossips.map(g => `<li>${g.fromNode} @ ${new Date(g.timestamp).toLocaleTimeString()} — ${g.aboutId ?? "—"}</li>`).join("")}
               </ul>
             </div>`
          : ""
      }
    `;
    list.appendChild(li);
  });
}

// initial load
loadSummary();
