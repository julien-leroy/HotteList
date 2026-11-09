-- AlterTable
ALTER TABLE "Family" ADD COLUMN "reminderSentFor" TEXT;

-- AlterTable
ALTER TABLE "Gift" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "lastSeenAt" DATETIME;
ALTER TABLE "Membership" ADD COLUMN "prevSeenAt" DATETIME;

-- CreateTable
CREATE TABLE "SecretSanta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "budget" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecretSanta_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecretSantaAssignment" (
    "santaId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    PRIMARY KEY ("santaId", "giverId"),
    CONSTRAINT "SecretSantaAssignment_santaId_fkey" FOREIGN KEY ("santaId") REFERENCES "SecretSanta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SecretSantaAssignment_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SecretSantaAssignment_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GiftParticipant" (
    "giftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'A_ACHETER',

    PRIMARY KEY ("giftId", "userId"),
    CONSTRAINT "GiftParticipant_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GiftParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GiftParticipant" ("createdAt", "giftId", "userId") SELECT "createdAt", "giftId", "userId" FROM "GiftParticipant";
DROP TABLE "GiftParticipant";
ALTER TABLE "new_GiftParticipant" RENAME TO "GiftParticipant";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "login" TEXT,
    "passwordHash" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT '#1F4D36',
    "email" TEXT,
    "emailVerifiedAt" DATETIME,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "managedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarColor", "createdAt", "email", "emailVerifiedAt", "firstName", "id", "lastName", "login", "managedById", "passwordHash") SELECT "avatarColor", "createdAt", "email", "emailVerifiedAt", "firstName", "id", "lastName", "login", "managedById", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SecretSanta_familyId_idx" ON "SecretSanta"("familyId");

