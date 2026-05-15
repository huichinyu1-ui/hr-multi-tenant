-- CreateTable
CREATE TABLE "Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_salary" REAL NOT NULL,
    "full_attendance_bonus" REAL NOT NULL DEFAULT 0,
    "production_bonus" REAL NOT NULL DEFAULT 0,
    "meal_allowance" REAL NOT NULL DEFAULT 0,
    "festival_bonus" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "username" TEXT,
    "password" TEXT DEFAULT 'password123',
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "gender" TEXT,
    "birthday" TEXT,
    "id_number" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "emergency_relationship" TEXT,
    "department" TEXT,
    "position" TEXT,
    "join_date" TEXT,
    "probation_date" TEXT,
    "resign_date" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "bank_code" TEXT,
    "bank_account" TEXT,
    "insurance_salary" REAL NOT NULL DEFAULT 0,
    "workShiftId" INTEGER,
    "roleId" INTEGER,
    "custom_field1" TEXT,
    "custom_field2" TEXT,
    "custom_field3" TEXT,
    "custom_field4" TEXT,
    "custom_field5" TEXT,
    "custom_field6" TEXT,
    CONSTRAINT "Employee_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "WorkShift" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_global" BOOLEAN NOT NULL DEFAULT true
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
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
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
    "note" TEXT,
    CONSTRAINT "PayrollDetail_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_paid" BOOLEAN NOT NULL,
    "deduction_ratio" REAL NOT NULL DEFAULT 1.0,
    "is_all_employees" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "start_date" TEXT NOT NULL,
    "start_time" TEXT DEFAULT '08:00',
    "end_date" TEXT NOT NULL,
    "end_time" TEXT DEFAULT '17:00',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyRecord" (
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

-- CreateTable
CREATE TABLE "CalendarDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "is_workday" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissedPunchRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "punch_type" TEXT NOT NULL,
    "target_time" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissedPunchRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveQuota" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_hours" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "LeaveQuota_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveQuota_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Metadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "db_url" TEXT NOT NULL,
    "db_token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roleId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "selfOnly" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canImport" BOOLEAN NOT NULL DEFAULT false,
    "canManagePayroll" BOOLEAN NOT NULL DEFAULT false,
    "canManageRole" BOOLEAN NOT NULL DEFAULT false,
    "canManageMetadata" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ItemToEmployee" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ItemToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItemToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "PayrollItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LeaveTypeEligibility" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LeaveTypeEligibility_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LeaveTypeEligibility_B_fkey" FOREIGN KEY ("B") REFERENCES "LeaveType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_username_key" ON "Employee"("username");

-- CreateIndex
CREATE UNIQUE INDEX "WorkShift_code_key" ON "WorkShift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_year_month_key" ON "Attendance"("employeeId", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_code_key" ON "PayrollItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeItemOverride_employeeId_payrollItemId_key" ON "EmployeeItemOverride"("employeeId", "payrollItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_employeeId_year_month_key" ON "PayrollRecord"("employeeId", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_code_key" ON "LeaveType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_employeeId_date_key" ON "DailyRecord"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDay_date_key" ON "CalendarDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveQuota_employeeId_leaveTypeId_year_key" ON "LeaveQuota"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_type_value_key" ON "Metadata"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_module_key" ON "RolePermission"("roleId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemToEmployee_AB_unique" ON "_ItemToEmployee"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemToEmployee_B_index" ON "_ItemToEmployee"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LeaveTypeEligibility_AB_unique" ON "_LeaveTypeEligibility"("A", "B");

-- CreateIndex
CREATE INDEX "_LeaveTypeEligibility_B_index" ON "_LeaveTypeEligibility"("B");

