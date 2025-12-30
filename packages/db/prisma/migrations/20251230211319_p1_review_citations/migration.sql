/*
  Warnings:

  - The values [REVIEWED] on the enum `QuestionItemStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuestionItemStatus_new" AS ENUM ('PENDING', 'DRAFTED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'FAILED', 'EXPORTED');
ALTER TABLE "public"."question_items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "question_items" ALTER COLUMN "status" TYPE "QuestionItemStatus_new" USING ("status"::text::"QuestionItemStatus_new");
ALTER TYPE "QuestionItemStatus" RENAME TO "QuestionItemStatus_old";
ALTER TYPE "QuestionItemStatus_new" RENAME TO "QuestionItemStatus";
DROP TYPE "public"."QuestionItemStatus_old";
ALTER TABLE "question_items" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "auto_approve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "export_file_path" TEXT,
ADD COLUMN     "review_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.65;

-- CreateTable
CREATE TABLE "answer_citations" (
    "id" TEXT NOT NULL,
    "question_item_id" TEXT NOT NULL,
    "embedding_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "snippet" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" TEXT NOT NULL,
    "question_item_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "answer_citations_question_item_id_idx" ON "answer_citations"("question_item_id");

-- CreateIndex
CREATE INDEX "answer_citations_embedding_id_idx" ON "answer_citations"("embedding_id");

-- CreateIndex
CREATE INDEX "review_events_question_item_id_idx" ON "review_events"("question_item_id");

-- CreateIndex
CREATE INDEX "review_events_reviewer_id_idx" ON "review_events"("reviewer_id");

-- AddForeignKey
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_question_item_id_fkey" FOREIGN KEY ("question_item_id") REFERENCES "question_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_citations" ADD CONSTRAINT "answer_citations_embedding_id_fkey" FOREIGN KEY ("embedding_id") REFERENCES "embeddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_question_item_id_fkey" FOREIGN KEY ("question_item_id") REFERENCES "question_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
