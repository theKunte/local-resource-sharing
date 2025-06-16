/*
  Warnings:

  - Added the required column `user` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "user" TEXT NOT NULL
);
INSERT INTO "new_Resource" ("description", "id", "image", "title") SELECT "description", "id", "image", "title" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
