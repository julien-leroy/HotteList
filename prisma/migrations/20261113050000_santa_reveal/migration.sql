-- Secret Santa : chacun découvre son tirage en cliquant sur « Découvrir »
ALTER TABLE "SecretSantaAssignment" ADD COLUMN "revealedAt" DATETIME;

-- Les tirages déjà faits étaient affichés directement : on les considère comme découverts
UPDATE "SecretSantaAssignment" SET "revealedAt" = CURRENT_TIMESTAMP;
