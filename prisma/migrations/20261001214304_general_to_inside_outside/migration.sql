-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "category" TEXT NOT NULL DEFAULT 'inside',
    "createdById" INTEGER,
    "approvedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("approvedById", "category", "createdAt", "createdById", "description", "id", "location", "status", "title") SELECT "approvedById", "category", "createdAt", "createdById", "description", "id", "location", "status", "title" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE TABLE "new_HourReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "date" DATETIME NOT NULL,
    "hoursRequested" REAL NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'inside',
    "origin" TEXT NOT NULL DEFAULT 'inside',
    "photoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HourReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HourReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HourReport" ("category", "createdAt", "date", "description", "hoursRequested", "id", "notes", "origin", "photoPath", "reviewedAt", "reviewedById", "status", "userId") SELECT "category", "createdAt", "date", "description", "hoursRequested", "id", "notes", "origin", "photoPath", "reviewedAt", "reviewedById", "status", "userId" FROM "HourReport";
DROP TABLE "HourReport";
ALTER TABLE "new_HourReport" RENAME TO "HourReport";
CREATE INDEX "HourReport_status_idx" ON "HourReport"("status");
CREATE INDEX "HourReport_userId_idx" ON "HourReport"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- "general" is gone: NHS events are inside; reports follow their origin so the
-- category matches how the hours are counted (outside = capped).
UPDATE "Event" SET "category" = 'inside' WHERE "category" = 'general';
UPDATE "HourReport" SET "category" = 'outside' WHERE "category" = 'general' AND "origin" = 'outside';
UPDATE "HourReport" SET "category" = 'inside' WHERE "category" = 'general';
