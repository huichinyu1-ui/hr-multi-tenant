-- CreateTable
CREATE TABLE "Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_salary" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "year_month" TEXT NOT NULL,
    "late_days" INTEGER NOT NULL DEFAULT 0,
    "absent_days" INTEGER NOT NULL DEFAULT 0,
    "work_hours" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "calc_type" TEXT NOT NULL,
    "default_amount" REAL,
    "formula_expr" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "EmployeeItemOverride" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "payrollItemId" INTEGER NOT NULL,
    "custom_amount" REAL,
    "custom_formula" TEXT,
    CONSTRAINT "EmployeeItemOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeItemOverride_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "year_month" TEXT NOT NULL,
    "total_addition" REAL NOT NULL,
    "total_deduction" REAL NOT NULL,
    "net_salary" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollDetail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payrollRecordId" INTEGER NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "PayrollDetail_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_year_month_key" ON "Attendance"("employeeId", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_code_key" ON "PayrollItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeItemOverride_employeeId_payrollItemId_key" ON "EmployeeItemOverride"("employeeId", "payrollItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_employeeId_year_month_key" ON "PayrollRecord"("employeeId", "year_month");
