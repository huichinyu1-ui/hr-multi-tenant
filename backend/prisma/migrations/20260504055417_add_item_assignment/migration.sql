-- CreateTable
CREATE TABLE "_ItemToEmployee" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ItemToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItemToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "PayrollItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayrollItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "calc_type" TEXT NOT NULL,
    "default_amount" REAL,
    "formula_expr" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_global" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_PayrollItem" ("calc_type", "code", "default_amount", "formula_expr", "id", "is_active", "name", "type") SELECT "calc_type", "code", "default_amount", "formula_expr", "id", "is_active", "name", "type" FROM "PayrollItem";
DROP TABLE "PayrollItem";
ALTER TABLE "new_PayrollItem" RENAME TO "PayrollItem";
CREATE UNIQUE INDEX "PayrollItem_code_key" ON "PayrollItem"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_ItemToEmployee_AB_unique" ON "_ItemToEmployee"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemToEmployee_B_index" ON "_ItemToEmployee"("B");
