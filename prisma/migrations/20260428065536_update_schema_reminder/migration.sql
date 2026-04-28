-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRemindDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remindSnoozeAt" TIMESTAMP(3),
ADD COLUMN     "sourceMessageId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "botAvatar" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
