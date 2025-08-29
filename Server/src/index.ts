import express, { Request, Response } from "express";
import path from "path";
// If you ever host the client on a different origin (e.g. :3000), install cors
// and uncomment the next two lines.
// import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { parseLog } from "./parse";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 8080);

// -------- middleware
app.use(express.json({ limit: "2mb" }));
// app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
// app.options("*", cors());

// -------- API
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.post("/api/ingest", async (req: Request, res: Response) => {
  const body = z.object({ log: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues });

  const { blocks, gossips } = parseLog(body.data.log);

  // upsert blocks first (idempotent)
  for (const b of blocks) {
    await prisma.block.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        fromNode: b.fromNode,
        timestamp: new Date(b.timestamp),
        payload: b.payload,
      },
      update: {
        fromNode: b.fromNode,
        timestamp: new Date(b.timestamp),
        payload: b.payload,
      },
    });
  }
  // 2) Insert parent→child edges (SQLite-safe: upsert each edge)
const edges: { parentId: string; childId: string }[] = [];
for (const b of blocks) {
  for (const pid of b.parents ?? []) {
    edges.push({ parentId: pid, childId: b.id });
  }
}

// de-dupe within this batch, then upsert so re-ingests don't fail on P2002
const seen = new Set<string>();
for (const e of edges) {
  const k = `${e.parentId}→${e.childId}`;
  if (seen.has(k)) continue;
  seen.add(k);

  await prisma.blockParent.upsert({
    where: { parentId_childId: { parentId: e.parentId, childId: e.childId } },
    create: { parentId: e.parentId, childId: e.childId },
    update: {}, // nothing to update
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

  res.json({ ok: true, inserted: { blocks: blocks.length, gossips: gossips.length, edges: edges.length } });
});

app.get("/api/blocks", async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({ orderBy: { timestamp: "asc" }, include: { parents: true } });
  res.json(blocks);
});

app.get("/api/blocks/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const block = await prisma.block.findUnique({ where: { id }, include: { parents: true } });
  if (!block) return res.status(404).json({ error: "Not found" });
  const gossips = await prisma.gossip.findMany({ where: { aboutId: id }, orderBy: { timestamp: "asc" } });
  res.json({ block, gossips });
});

app.get("/api/gossips", async (_req: Request, res: Response) => {
  const g = await prisma.gossip.findMany({ orderBy: { timestamp: "asc" } });
  res.json(g);
});

app.get("/api/summary", async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({ orderBy: { timestamp: "asc" }, include: { parents: true } });
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

// -------- static client (same origin; no CORS needed)
const CLIENT_DIR = path.resolve(__dirname, "..", "..", "client");
app.use(express.static(CLIENT_DIR));
app.get("/favicon.ico", (_req, res) => res.status(204).end());
// Option A: simple wildcard
// Option B: regex that excludes /api
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});



app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
