-- Mode Secret Santa de la famille
ALTER TABLE "Family" ADD COLUMN "santaMode" BOOLEAN NOT NULL DEFAULT false;

-- Les familles qui avaient déjà fait un tirage passent en mode Secret Santa
UPDATE "Family" SET "santaMode" = true WHERE "id" IN (SELECT "familyId" FROM "SecretSanta");
