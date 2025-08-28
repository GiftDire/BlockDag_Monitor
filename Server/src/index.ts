import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { parseLog } from "./parser";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Ingest raw log -> parse -> save to DB
app.post("/api/ingest", async (req, res) => {
  const bodySchema = z.object({ log: z.string().min(1, "log is required") });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { blocks, gossips } = parseLog(parsed.data.log);

  // upsert blocks + parents
  for (const b of blocks) {
    await prisma.block.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        fromNode: b.fromNode,
        timestamp: new Date(b.timestamp),
        payload: b.payload,
        parents: {
          create: b.parents.map((p) => ({ parentId: p, childId: b.id })),
        },
      },
      update: {
        fromNode: b.fromNode,
        timestamp: new Date(b.timestamp),
        payload: b.payload,
      },
    });
  }

  // insert gossips
  for (const g of gossips) {
    await prisma.gossip.create({
      data: {
        fromNode: g.fromNode,
        aboutId: g.aboutId ?? null,
        timestamp: new Date(g.timestamp),
        payload: g.payload,
      },
    });
  }

  res.json({ inserted: { blocks: blocks.length, gossips: gossips.length } });
});

// All blocks (chronological) with parent links
app.get("/api/blocks", async (_req, res) => {
  const blocks = await prisma.block.findMany({
    orderBy: { timestamp: "asc" },
    include: { parents: true },
  });
  res.json(blocks);
});

// Single block + its gossips
app.get("/api/blocks/:id", async (req, res) => {
  const id = req.params.id;
  const block = await prisma.block.findUnique({
    where: { id },
    include: { parents: true },
  });
  if (!block) return res.status(404).json({ error: "Not found" });

  const gossips = await prisma.gossip.findMany({
    where: { aboutId: id },
    orderBy: { timestamp: "asc" },
  });
  res.json({ block, gossips });
});

// All gossips
app.get("/api/gossips", async (_req, res) => {
  const g = await prisma.gossip.findMany({ orderBy: { timestamp: "asc" } });
  res.json(g);
});

// Summary: blocks + attached gossips
app.get("/api/summary", async (_req, res) => {
  const blocks = await prisma.block.findMany({
    orderBy: { timestamp: "asc" },
    include: { parents: true },
  });
  const gMap = (await prisma.gossip.findMany()).reduce<Record<string, any[]>>((acc, g) => {
    const key = g.aboutId ?? "__none__";
    (acc[key] ||= []).push(g);
    return acc;
  }, {});
  const summary = blocks.map((b) => ({
    id: b.id,
    fromNode: b.fromNode,
    timestamp: b.timestamp,
    parents: b.parents.map((p) => p.parentId),
    payload: b.payload,
    gossips: gMap[b.id] || [],
  }));
  res.json(summary);
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
