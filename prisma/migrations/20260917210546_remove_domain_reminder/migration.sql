/*
  Warnings:

  - You are about to drop the `DomainReminderDismissal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `domainReminderSentYear` on the `ChapterSettings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DomainReminderDismissal_userId_year_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DomainReminderDismissal";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChapterSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "chapterName" TEXT NOT NULL DEFAULT 'Aberjona NHS Chapter',
    "totalHoursGoal" REAL NOT NULL DEFAULT 30.0,
    "outsideHoursCap" REAL NOT NULL DEFAULT 14.0,
    "schoolYearEndMonth" INTEGER NOT NULL DEFAULT 6,
    "schoolYearEndDay" INTEGER NOT NULL DEFAULT 30,
    "publicUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChapterSettings" ("chapterName", "id", "outsideHoursCap", "publicUrl", "schoolYearEndDay", "schoolYearEndMonth", "totalHoursGoal", "updatedAt") SELECT "chapterName", "id", "outsideHoursCap", "publicUrl", "schoolYearEndDay", "schoolYearEndMonth", "totalHoursGoal", "updatedAt" FROM "ChapterSettings";
DROP TABLE "ChapterSettings";
ALTER TABLE "new_ChapterSettings" RENAME TO "ChapterSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
