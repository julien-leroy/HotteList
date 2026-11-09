-- AlterTable
ALTER TABLE "Gift" ADD COLUMN "archiveEvent" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "eventName" TEXT NOT NULL DEFAULT 'Noël',
    "reminderSentFor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Family_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Family" ("createdAt", "createdById", "eventDate", "id", "name", "reminderSentFor", "slug") SELECT "createdAt", "createdById", "eventDate", "id", "name", "reminderSentFor", "slug" FROM "Family";
DROP TABLE "Family";
ALTER TABLE "new_Family" RENAME TO "Family";
CREATE UNIQUE INDEX "Family_slug_key" ON "Family"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

