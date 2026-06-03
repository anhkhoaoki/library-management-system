-- DropIndex
DROP INDEX "reservations_userId_bookId_status_key";

-- CreateIndex
CREATE INDEX "reservations_userId_idx" ON "reservations"("userId");
