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
    "status" TEXT NOT NULL DEFAULT 'ACTIVE'
);
INSERT INTO "new_Employee" ("base_salary", "code", "id", "name", "status") SELECT "base_salary", "code", "id", "name", "status" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
