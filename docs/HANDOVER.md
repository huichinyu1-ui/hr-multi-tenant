# HR Multi-Tenant System Handover Documentation

This document provides a comprehensive overview of the system architecture and current state to ensure a smooth transition for any future developer or AI assistant.

---

## 🏗️ System Architecture Overview

The system is a **Multi-Tenant HR Management Portal** designed to serve multiple companies from a single codebase while maintaining data isolation via separate databases.

### 1. Technology Stack
- **Frontend**: React 19 + Vite 8 + TailwindCSS 4 + Lucide Icons.
- **Backend**: Node.js + Express 5 + Prisma (ORM).
- **Database**: Turso (LibSQL) Cloud DB (Separate DB per tenant).
- **Deployment**: Vercel (Monorepo-style deployment).

---

## 📂 Directory Structure (Key Paths)

### Root
- `/frontend`: React client application.
- `/backend`: Express API server.
- `vercel.json`: Global routing and deployment config.

---

## 🚀 Key Features Implemented (Latest Update: May 9, 2026)

### 1. Advanced GPS Punch System
- **Forced Location Verification**: Punch buttons trigger a real-time high-accuracy GPS check with a 10s timeout.
- **Geofencing**: Users must be within the `punch_radius_meters` (configured in Settings) to punch.
- **Dynamic Status**: Real-time calculation of "Normal", "Late", "Early Leave", "Too Early", or "Invalid" based on shift rules.

### 2. Customizable Punch Window (New!)
- **Shift-Based Buffers**: Each shift now has a `punch_in_window_mins` field.
- **Security**: Punches made before this window (e.g., in the middle of the night) are flagged as `TOO_EARLY` and not counted as "Normal".
- **Invalid Punch Detection**: Prevents clock-outs that occur before the shift even starts.

### 3. Dynamic RBAC (Role-Based Access Control)
- Granular permissions managed via the `Roles` page, including the new `canPunch` and `canManageSettings` capabilities.

---

## 🛠️ Developer/AI Handover Notes

### 1. Database Schema Sync
- **Crucial**: The following columns were manually added to the **TJS1** cloud database:
    - `WorkShift`: Added `punch_in_window_mins` (INTEGER, Default 240).
    - `DailyRecord`: Added `clock_in_status` (TEXT) and `clock_out_status` (TEXT).
- If creating a new tenant, ensure these columns exist in the initialization SQL.

### 2. Troubleshooting History (The "500 Error" Incident)
- **Problem**: Login and Punching failed with 500 error.
- **Root Cause 1**: Duplicate `express` declaration in `metadataRoutes.js` (SyntaxError).
- **Root Cause 2**: Prisma was trying to save `clock_in_status` to a database that didn't have the column yet.
- **Resolution**: Fixed syntax, ran manual `ALTER TABLE` via temporary server-side endpoints, and enabled detailed error reporting in controllers.

### 3. Deployment Warning
- Always ensure `vercel-build` in `package.json` runs `prisma generate`.
- Do not use `&&` in Windows PowerShell commands when calling Git or Node unless carefully escaped.

---

## 📝 Recent Changes (May 9, 2026)
- **UI Overhaul**: Card-style punch buttons with integrated status and time.
- **Safety**: Implemented "Too Early" punch interception to prevent anomalous midnight records.
- **Documentation**: Established this handover file and the project-internal backup system.

---

## 📝 Pending Tasks & Optimization (TODO)

1. **[UI/UX] Permissions Page Cleanup**: Hide redundant checkboxes (Add/Edit/Delete) for non-CRUD modules like `SETTINGS`, `ATT`, and `PAYROLL` to reduce admin confusion.
2. **[Security] Audit Logs**: Implement a logging mechanism for critical system metadata changes (e.g., GPS coordinate or radius updates).
3. **[Testing] Live Status Verification**: Confirm that `TOO_EARLY` and `INVALID` labels display correctly on the user dashboard during edge-case punch attempts.
4. **[Maintenance] Automated Schema Migrations**: Develop a more robust way to sync tenant databases without manual server-side scripts.

---

**Last Updated by: Antigravity AI**
