-- AlterTable: unique constraint on sourceMessageId prevents duplicate bot messages
-- CreateIndex
CREATE UNIQUE INDEX "messages_sourceMessageId_key" ON "messages"("sourceMessageId");
