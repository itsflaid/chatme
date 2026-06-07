-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'CHECKLIST');

-- AlterTable
ALTER TABLE "messages"
ADD COLUMN "type" "MessageType" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_items_messageId_position_idx"
ON "checklist_items"("messageId", "position");

-- AddForeignKey
ALTER TABLE "checklist_items"
ADD CONSTRAINT "checklist_items_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
