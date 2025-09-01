# BlockDAG Message Propagation Monitor

## 📌 Overview
This project is a BlockDAG visualization tool built for the internship coding challenge.  
It parses log messages (`BLOCK` and `GOSSIP`), stores them in a database, and provides a UI to explore the block structure, gossips, and relationships.

---

## 🛠️ Features
- Parse raw log text into structured data.
- Persist blocks, parent–child edges, and gossip messages in a database via Prisma + SQLite.
- API endpoints to ingest logs, fetch summaries, fetch a block by ID, and list gossips.
- Client-side UI with:
  - **Ingest** logs button.
  - **Refresh** summary button.
  - **Lookup** block by ID.
  - **Blocks** page listing all blocks with details.
  - Graph page to visualize block relationships.
---

## ⚙️ Setup
Client/
 ├─ index.html        # main UI: ingest, refresh, lookup, summary
 ├─ blocks.html       # all blocks list
 ├─ graph.html        # DAG visualization
 ├─ js/
 │   ├─ app.js        # ingest/summary/lookup
 │   ├─ graph.js      # vis-network DAG
 │   └─ api.js        # tiny fetch helpers
 └─ css/tailwind.css  # entry if you later build Tailwind locally

Server/
 ├─ src/
 │   ├─ index.ts      # Express + Prisma API
 │   ├─ parse.ts      # log parser
 │   └─ seed.ts       # sample data
 └─ prisma/schema.prisma

### 1. Install dependencies
```bash
cd Server
npm install
cd ../Client
npm install   # only if you later add a bundler or Tailwind build

###2.Run the server
cd Server
npm run dev

###3.Open the client
cd Client
# if you have serve installed globally
serve .

🤝 Assumptions

Logs will always follow the provided format (FROM, TYPE, PARENTS, TIMESTAMP, PAYLOAD).

Each block has a unique ID (BDG-XXX), used as the primary key.

Gossip messages reference block IDs that may or may not exist yet (still stored).

Parents are stored in a separate BlockParent relation for flexibility.

🧩 Design Decisions

Prisma + SQLite: Lightweight, easy to set up for quick prototyping.

Express API: Clean separation of concerns between backend (storage/logic) and frontend (UI).

Zod validation: Ensures ingested logs are well-formed before saving.

Vanilla JS + Tailwind: Keeps the client lightweight and dependency-free.

Graph view: Added with D3.js-style approach for visualizing parent–child relationships.

🚀 Next Steps: (if extended)

Add authentication for log ingestion.

Improve graph visualization (zoom, pan, filters).

Deploy server + client to cloud (e.g., Vercel + Railway).