-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromNode" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "payload" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BlockParent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    CONSTRAINT "BlockParent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Block" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlockParent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Block" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gossip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromNode" TEXT NOT NULL,
    "aboutId" TEXT,
    "timestamp" DATETIME NOT NULL,
    "payload" TEXT NOT NULL
);
