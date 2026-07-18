ALTER TABLE "LearningItem" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "knowledge_base_items" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "LearningItem_userId_createdAt_idx"
  ON "LearningItem"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "knowledge_base_items_userId_createdAt_idx"
  ON "knowledge_base_items"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "learning_stats_userId_updatedAt_idx"
  ON "learning_stats"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "notes_userId_updatedAt_idx"
  ON "notes"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "review_cards" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceSessionId" TEXT,
  "subject" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "stage" INTEGER NOT NULL DEFAULT 0,
  "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReviewedAt" TIMESTAMP(3),
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "review_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "review_cards_userId_nextReviewAt_idx"
  ON "review_cards"("userId", "nextReviewAt");
CREATE INDEX IF NOT EXISTS "review_cards_sourceSessionId_idx"
  ON "review_cards"("sourceSessionId");
