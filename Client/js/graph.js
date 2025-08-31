async function load() {
  const res = await fetch("/api/summary");
  const data = await res.json();

  const nodes = data.map((b) => ({ id: b.id, label: b.id, shape: "box" }));
  const edges = [];
  for (const b of data) for (const p of b.parents) edges.push({ from: p, to: b.id, arrows: "to" });

  const container = document.getElementById("graph");
  new vis.Network(
    container,
    { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) },
    { physics: { enabled: true, solver: "forceAtlas2Based" } }
  );
}
load();
