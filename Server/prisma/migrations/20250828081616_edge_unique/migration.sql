/*
  Warnings:

  - A unique constraint covering the columns `[parentId,childId]` on the table `BlockParent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BlockParent_parentId_childId_key" ON "BlockParent"("parentId", "childId");
