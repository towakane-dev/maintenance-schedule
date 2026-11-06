ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'admin';
UPDATE "User" SET "role" = 'superadmin' WHERE "username" = 'admin';
