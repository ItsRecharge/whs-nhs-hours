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
    "domainReminderSentYear" INTEGER,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChapterSettings" ("chapterName", "domainReminderSentYear", "id", "outsideHoursCap", "publicUrl", "schoolYearEndDay", "schoolYearEndMonth", "totalHoursGoal", "updatedAt") SELECT "chapterName", "domainReminderSentYear", "id", "outsideHoursCap", "publicUrl", "schoolYearEndDay", "schoolYearEndMonth", "totalHoursGoal", "updatedAt" FROM "ChapterSettings";
DROP TABLE "ChapterSettings";
ALTER TABLE "new_ChapterSettings" RENAME TO "ChapterSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
