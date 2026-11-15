-- Perbaikan data: kolom area jadwal harus berisi area aset, bukan kategori
UPDATE "Schedule" SET "area" = (SELECT a."area" FROM "Asset" a WHERE a."id" = "Schedule"."assetId");
