-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImdbTmdb" (
    "imdb" TEXT NOT NULL PRIMARY KEY,
    "tmdb" INTEGER NOT NULL,
    "type" TEXT NOT NULL
);
INSERT INTO "new_ImdbTmdb" ("imdb", "tmdb", "type") SELECT "imdb", "tmdb", "type" FROM "ImdbTmdb";
DROP TABLE "ImdbTmdb";
ALTER TABLE "new_ImdbTmdb" RENAME TO "ImdbTmdb";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
