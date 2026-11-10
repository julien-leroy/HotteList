-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "emailMentions" BOOLEAN NOT NULL DEFAULT true,
    "managedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarColor", "createdAt", "email", "emailReminders", "emailVerifiedAt", "firstName", "id", "lastName", "login", "managedById", "passwordHash") SELECT "avatarColor", "createdAt", "email", "emailReminders", "emailVerifiedAt", "firstName", "id", "lastName", "login", "managedById", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

