-- Comptes invités : on rejoint une famille avec juste son prénom
ALTER TABLE "User" ADD COLUMN "guest" BOOLEAN NOT NULL DEFAULT false;

-- Mot de passe en attente pendant qu'un invité confirme son adresse
ALTER TABLE "EmailCode" ADD COLUMN "passwordHash" TEXT;
