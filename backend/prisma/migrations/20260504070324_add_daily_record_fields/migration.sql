-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "clock_in" TEXT,
    "clock_out" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "leave_code" TEXT,
    "late_mins" INTEGER NOT NULL DEFAULT 0,
    "early_leave_mins" INTEGER NOT NULL DEFAULT 0,
    "work_mins" INTEGER NOT NULL DEFAULT 0,
    "overtime1_mins" INTEGER NOT NULL DEFAULT 0,
    "overtime2_mins" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DailyRecord" ("clock_in", "clock_out", "date", "employeeId", "id", "leave_code", "status") SELECT "clock_in", "clock_out", "date", "employeeId", "id", "leave_code", "status" FROM "DailyRecord";
DROP TABLE "DailyRecord";
ALTER TABLE "new_DailyRecord" RENAME TO "DailyRecord";
CREATE UNIQUE INDEX "DailyRecord_employeeId_date_key" ON "DailyRecord"("employeeId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
