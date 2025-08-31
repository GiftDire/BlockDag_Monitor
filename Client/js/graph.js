const API_BASE = "http://localhost:8080";

const $ = (s) => document.querySelector(s);
const fmt = (ts) => new Date(ts).toLocaleString();

const container = $("#graph");
const inspectorBody = $("#inspectorBody");
const refreshBtn = $("#refreshGraph");

let network;
let nodesDS;
let edgesDS;

async function fetchSummary() {
  const r = await fetch(`${API_BASE}/api/summary`);
  if (!r.ok) throw new Error("Failed to load summary");
  return r.json();
}

function nodeColor(parentsCount) {
  if (parentsCount === 0) return "#10b981"; // green-500 (genesis)
  if (parentsCount >= 2) return "#f59e0b"; // amber-500 (merge)
  return "#3b82f6"; // blue-500 (normal)
}

function buildData(summary) {
  const nodes = summary.map((b) => ({
    id: b.id,
    label: b.id,
    shape: "box",
    color: {
      background: nodeColor(b.parents.length),
      border: "#94a3b8",
      highlight: { background: "#6366f1", border: "#a5b4fc" },
    },
    font: { color: "#e2e8f0" },
    title: `${b.id}\n${fmt(b.timestamp)}`, // tooltip
    _meta: b, // stash full record for inspector
  }));

  const edges = [];
  for (const b of summary) {
    for (const p of b.parents) {
      edges.push({
        from: p,
        to: b.id,
        arrows: "to",
        color: { color: "#64748b" },
      });
    }
  }
  return { nodes, edges };
}

function renderInspector(b) {
  const parents = b.parents.length ? b.parents.join(", ") : "— (genesis)";
  const gList = (b.gossips || [])
    .map(
      (g) => `• ${g.fromNode} @ ${fmt(g.timestamp)} — ${g.aboutId ?? "—"}`
    )
    .join("<br>") || "—";

  inspectorBody.innerHTML = `
    <div class="font-mono text-slate-100 mb-1">${b.id}</div>
    <div class="text-slate-400 mb-2">${fmt(b.timestamp)}</div>
    <div class="mb-1"><span class="text-slate-400">Parents:</span> ${parents}</div>
    <div class="mt-2">
      <div class="text-slate-400">Gossips:</div>
      <div>${gList}</div>
    </div>
  `;
}

async function loadGraph() {
  const summary = await fetchSummary();
  const { nodes, edges } = buildData(summary);

  if (!nodesDS) {
    nodesDS = new vis.DataSet(nodes);
    edgesDS = new vis.DataSet(edges);

    network = new vis.Network(
      container,
      { nodes: nodesDS, edges: edgesDS },
      {
        layout: {
          hierarchical: {
            enabled: true,
            direction: "LR", // Left -> Right
            sortMethod: "directed",
            levelSeparation: 180,
            nodeSpacing: 120,
          },
        },
        physics: { enabled: false }, // better for hierarchical
        interaction: {
          hover: true,
          multiselect: false,
          zoomView: true,
          dragView: true,
        },
        nodes: { margin: 8 },
        edges: { smooth: { type: "cubicBezier", roundness: 0.4 } },
      }
    );

    network.on("click", (params) => {
      if (!params.nodes?.length) return;
      const id = params.nodes[0];
      const n = nodesDS.get(id);
      if (n?._meta) renderInspector(n._meta);
    });
  } else {
    nodesDS.clear();
    edgesDS.clear();
    nodesDS.add(nodes);
    edgesDS.add(edges);
  }
}

refreshBtn?.addEventListener("click", () => loadGraph());
loadGraph();
