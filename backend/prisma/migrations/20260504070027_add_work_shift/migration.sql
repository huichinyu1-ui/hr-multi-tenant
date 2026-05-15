-- CreateTable
CREATE TABLE "WorkShift" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "work_start" TEXT NOT NULL,
    "work_end" TEXT NOT NULL,
    "rest_start" TEXT,
    "rest_end" TEXT,
    "overtime_start" TEXT,
    "late_buffer_mins" INTEGER NOT NULL DEFAULT 0,
    "overtime_min_unit" INTEGER NOT NULL DEFAULT 30
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_salary" REAL NOT NULL,
    "full_attendance_bonus" REAL NOT NULL DEFAULT 0,
    "production_bonus" REAL NOT NULL DEFAULT 0,
    "meal_allowance" REAL NOT NULL DEFAULT 0,
    "festival_bonus" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "workShiftId" INTEGER,
    CONSTRAINT "Employee_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "WorkShift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("base_salary", "code", "festival_bonus", "full_attendance_bonus", "id", "meal_allowance", "name", "production_bonus", "status") SELECT "base_salary", "code", "festival_bonus", "full_attendance_bonus", "id", "meal_allowance", "name", "production_bonus", "status" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WorkShift_code_key" ON "WorkShift"("code");
