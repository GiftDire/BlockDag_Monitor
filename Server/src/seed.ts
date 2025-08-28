import { PrismaClient } from "@prisma/client";
import { parseLog } from "./parse";

const prisma = new PrismaClient();

const sampleLog = `# FROM: node-7
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

async function main() {
  const { blocks, gossips } = parseLog(sampleLog);

  // Clean slate for dev seeding
  await prisma.blockParent.deleteMany();
  await prisma.gossip.deleteMany();
  await prisma.block.deleteMany();

  // 1) Insert blocks
  for (const b of blocks) {
    await prisma.block.create({
      data: {
        id: b.id,
        fromNode: b.fromNode,
        timestamp: new Date(b.timestamp),
        payload: b.payload,
      },
    });
  }

  // 2) Build parent → child edges and de-duplicate in code
  const edgeSet = new Set<string>();
  const edges: { parentId: string; childId: string }[] = [];
  for (const b of blocks) {
    for (const pid of b.parents ?? []) {
      const key = `${pid}→${b.id}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ parentId: pid, childId: b.id });
      }
    }
  }
  if (edges.length) {
    await prisma.blockParent.createMany({ data: edges }); // no skipDuplicates on SQLite
  }

  // 3) Insert gossips (bulk)
  const gossipRows = gossips.map((g) => ({
    fromNode: g.fromNode,
    aboutId: g.aboutId ?? null,
    timestamp: new Date(g.timestamp),
    payload: g.payload,
  }));
  if (gossipRows.length) {
    await prisma.gossip.createMany({ data: gossipRows });
  }

  console.log("✅ Seeded sample data");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
