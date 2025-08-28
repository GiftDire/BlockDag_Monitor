type Block = {
  id: string;
  fromNode: string;
  timestamp: string;
  payload: string;
  parents: string[];
};

type Gossip = {
  fromNode: string;
  aboutId?: string;
  timestamp: string;
  payload: string;
};

export function parseLog(raw: string): { blocks: Block[]; gossips: Gossip[] } {
  const entries = raw.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);
  let seq = 1;
  const nextId = () => `BDG-${String(seq++).padStart(3, "0")}`;

  const blocks: Block[] = [];
  const gossips: Gossip[] = [];

  for (const e of entries) {
    const from = matchLine(e, /^#\s*FROM:\s*(.+)$/m) ?? "unknown";
    const type =
      matchLine(e, /^#\s*FROM:.*\n\s*TYPE:\s*(.+)$/m) ||
      matchLine(e, /^TYPE:\s*(.+)$/m) || "";
    const parentsLine = matchLine(e, /^PARENTS:\s*\[(.*)\]/m) || "";
    const timestamp = matchLine(e, /^TIMESTAMP:\s*(.+)$/m) ?? new Date().toISOString();
    const payload = (matchLine(e, /^PAYLOAD:\s*([\s\S]*?)$/m) ?? "").trim();

    // ✅ ONLY accept an explicit block ID from a dedicated header like "ID:" or "BLOCK_ID:"
    const idFromHeader =
      matchLine(e, /^ID:\s*(BDG-\d{3})$/m) ||
      matchLine(e, /^BLOCK_ID:\s*(BDG-\d{3})$/m) ||
      undefined;

    if (type.toUpperCase() === "BLOCK") {
      const id = idFromHeader || nextId(); // ✅ do NOT search whole entry or payload
      const parents = parentsLine
        .split(",")
        .map(s => s.replace(/[\[\]\s]/g, ""))
        .filter(Boolean);
      blocks.push({ id, fromNode: from.trim(), timestamp: timestamp.trim(), payload, parents });
    } else if (type.toUpperCase() === "GOSSIP") {
      // For gossips it’s fine to extract an ID mentioned anywhere in payload
      const about = findFirstId(payload);
      gossips.push({
        fromNode: from.trim(),
        aboutId: about || undefined,
        timestamp: timestamp.trim(),
        payload,
      });
    }
  }

  return { blocks, gossips };
}

function matchLine(text: string, regex: RegExp): string | undefined {
  const m = text.match(regex);
  return m ? m[1].trim() : undefined;
}

function findFirstId(text?: string): string | undefined {
  if (!text) return undefined;
  const m = text.match(/BDG-\d{3}/);
  return m ? m[0] : undefined;
}
