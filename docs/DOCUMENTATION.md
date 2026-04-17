# Customer Portal — Technical Documentation

**Version:** 1.0  
**Framework:** Next.js 14 (App Router)  
**Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Authentication System](#5-authentication-system)
6. [User Roles & Access Control](#6-user-roles--access-control)
7. [Database Models](#7-database-models)
8. [API Routes](#8-api-routes)
9. [Application Pages](#9-application-pages)
10. [Controllers](#10-controllers)
11. [Services](#11-services)
12. [AMMP External API Integration](#12-ammp-external-api-integration)
13. [Email Service](#13-email-service)
14. [AWS S3 Integration](#14-aws-s3-integration)
15. [UI Components](#15-ui-components)
16. [Navigation & Routing](#16-navigation--routing)
17. [Running the Application](#17-running-the-application)

---

## 1. Overview

The **Customer Portal** is a B2B energy monitoring and reporting platform built for Daystar Power. It allows customers and internal administrators to:

- Monitor solar, battery, genset, and grid power in real time via the AMMP Data API
- View per-site asset dashboards with live and historic charts
- Create, edit, and export monthly solar hybrid energy reports
- Upload and compare planned vs. actual PV production data
- View site-level alerts and status logs from AMMP
- Manage users, customers, roles, and support queries
- Authenticate securely with email OTP and/or TOTP 2FA

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, server components) |
| Language | JavaScript (ES Modules) |
| Database | PostgreSQL via Sequelize 6 ORM |
| Auth | Lucia v3 (session-based, `user_sessions` table) |
| Styling | Tailwind CSS + DaisyUI + CSS Modules |
| Charting | Chart.js + react-chartjs-2 |
| Email | SendGrid (`@sendgrid/mail`) |
| File Storage | AWS S3 (`@aws-sdk/client-s3`) |
| File Parsing | `xlsx` (Excel import/export) |
| 2FA | `otplib` (TOTP), `qrcode` (QR generation) |
| UI Libraries | MUI, Headless UI, React Icons, Heroicons |
| Deployment | Docker (`Dockerfile` present) |

---

## 3. Project Structure

```
Customer-Portal/
├── app/                        # Next.js App Router (pages + API routes)
│   ├── (auth)/                 # Public auth pages: login, verify, 2FA, forgot-password, reset-password
│   ├── dashboard/              # Main dashboard page
│   ├── Assets/Details/[slug]/  # Per-asset detail page (slug = AMMP asset_id)
│   ├── reports/                # Monthly solar hybrid reports
│   ├── planned-data-upload/    # Planned production Excel upload
│   ├── planned-vs-actual/      # Planned vs Actual chart
│   ├── alerts/                 # Site alerts from AMMP
│   ├── support/                # Support tickets
│   ├── customers/              # Customer management
│   ├── profile/                # User profile + 2FA setup
│   ├── admin/                  # Administration area
│   │   ├── identity/           # Users, Roles, Security Logs
│   │   ├── audit-logs/
│   │   ├── text-templates/
│   │   └── settings/
│   ├── api/
│   │   └── ammp/               # BFF proxy API routes
│   │       ├── historic-battery/route.js
│   │       ├── historic-kpi/route.js
│   │       └── historic-power/route.js
│   ├── 403/ and 404/           # Error pages
│   └── layout.js               # Root layout with MainAppLayout
│
├── components/
│   ├── Dashboard/              # DashboardScreen, DashboardComponent, AssetDetailsScreen
│   ├── Reports/                # ReportsScreen
│   ├── PlannedVsActual/        # PlannedVsActualScreen
│   ├── Alerts/                 # AlertsScreen, AlertsTable
│   ├── Layout/                 # MainAppLayout (sidebar + content), sharedLayout.module.css
│   └── ui/
│       ├── Navbar/             # Navbar.jsx (role-based sidebar), NavbarContainer.js
│       ├── charts/             # PowerLineChart, BatteryChart, GensetChart, PerformanceLineChart
│       │                       # DonutChartComponent, HalfDonutChartComponent, PlannedVsActualChart
│       ├── tables/             # Per-domain data tables (users, customers, reports, etc.)
│       ├── modals/             # Create/edit modals (CreateUsersModal, UserActions, etc.)
│       ├── icons/              # SVG icon components
│       ├── button-flexible/    # ButtonFlexible reusable button
│       └── pagination/         # PaginationComponent
│
├── database/
│   ├── models/                 # Sequelize models (17 models)
│   ├── migrations/             # Database migrations
│   ├── seeders/                # Seed data (roles, statuses, text templates, default users)
│   └── config/config.mjs       # Sequelize DB configuration
│
├── lib/
│   ├── auth/                   # Lucia auth, login/logout, OTP, 2FA, password hashing
│   ├── controllers/            # Business logic per domain (one file per operation)
│   ├── services/
│   │   ├── ammp/               # AmmpServices.js (all AMMP calls), getAmmpToken.js
│   │   └── mail/               # sendMail.js (SendGrid)
│   └── context/                # UserContext.js (client-side user state)
│
├── utils/
│   └── constants.js            # ServiceConstants (URLs, limits), formatters, validators
│
├── public/
│   └── img/daystar/            # Logos, background images
│
├── docs/
│   └── DOCUMENTATION.md        # This file
│
├── db_connection.js            # Singleton Sequelize connection (hot-reload safe)
├── next.config.mjs             # Next.js config (no strict rewrites — standard)
├── tailwind.config.js          # Tailwind + DaisyUI config
└── Dockerfile                  # Docker build
```

---

## 4. Environment Variables

Create a `.env` file at the project root with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# PostgreSQL Database
DB_NAME=customer_portal
DB_USER=postgres
DB_PASS=yourpassword
DB_HOST=localhost
DB_PORT=5432

# AMMP API (global fallback key — overridden per user if user.ammp_api_key is set)
AMMP_API_KEY=your_ammp_api_key

# Security
ENCRYPTION_KEY=your_32_byte_base64_key   # Used for AES-256-GCM TOTP secret encryption
APP_NAME=Customer-Portal                  # TOTP issuer name shown in authenticator apps

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# AWS S3
BUCKET_NAME=your-s3-bucket
BUCKET_REGION=eu-west-1
BUCKET_ACCESS_KEY=AKIAxxx
BUCKET_SECRET_KEY=your_secret
BUCKET_SESSION_TOKEN=optional_session_token
```

---

## 5. Authentication System

### Overview

Authentication uses a multi-step flow:

```
Login (email + password)
    │
    ├── Failed → increment failed_login_attempts
    │            5 failures → lockout for 1 hour
    │
    ├── 2FA enabled (totp_enabled=true) → inline TOTP form
    │       └── Valid TOTP → create session → redirect to /dashboard
    │
    └── No 2FA → generate 6-digit email OTP → redirect to /verify
            └── Valid OTP → create session → redirect to /dashboard
```

### Session Management

- **Library:** Lucia v3
- **Adapter:** `@lucia-auth/adapter-postgresql` (reads/writes `user_sessions` table)
- **Session TTL:** 1 hour
- **Cookie:** `auth_session`, `HttpOnly`, `Secure` in production
- **Session created:** Only after successful OTP or TOTP verification

### Password Hashing

- Algorithm: `crypto.scryptSync` (Node.js built-in)
- Format stored in DB: `hex(hash):hex(salt)`
- Verification uses `crypto.timingSafeEqual` to prevent timing attacks

### Email OTP

- Generated as a random 6-digit number
- Stored in `verification_codes` table with a 10-minute expiry
- Sent via SendGrid using the `Account.EmailSecurityCode` text template
- One active code per user (upserted on each login)

### TOTP 2FA

- Library: `otplib` (RFC 6238)
- Secret generated during setup stored as AES-256-GCM encrypted value in `user.totp_secret`
- Encryption key: `process.env.ENCRYPTION_KEY` (32-byte base64)
- QR code generated with `qrcode` package for authenticator app scanning
- Setup is a two-step confirmation flow:
  1. `startEnable2FA` → generates temp secret, returns QR code
  2. `confirmEnable2FA` → validates first OTP, promotes temp secret to permanent

### Account Lockout

- 5 consecutive failed login attempts → account locked for 1 hour
- `is_locked_out` flag in `users` table
- `lockout_until` datetime stored; auto-releases when time passes

### Password Reset

- User submits email → UUID token generated → stored in `verification_codes` → email sent with link:
  `{NEXT_PUBLIC_BASE_URL}/reset-password/{token}`
- Token is single-use (deleted after reset)

### Auth Guard

Every protected page calls `verifyAuth()` at the top of its server component. No global middleware.js exists — each page is responsible for its own auth check.

```js
const result = await verifyAuth();
if (!result.user) return redirect('/');
```

---

## 6. User Roles & Access Control

### Roles (seeded into `user_roles` table)

| Role Name | Normalized | Description |
|---|---|---|
| `Admin` | ADMIN | Full system access |
| `Daystar Portal Admin` | DAYSTAR PORTAL ADMIN | Full system access (Daystar staff) |
| `Daystar Customer Admin` | DAYSTAR CUSTOMER ADMIN | Customer management; no admin panel or dashboard |
| `Customer User` | CUSTOMER USER | Read-only access to their own customer's data |

Users can have **multiple roles** simultaneously. Access checks union all assigned roles.

### Navbar Visibility by Role

| Nav Item | Admin | Daystar Portal Admin | Daystar Customer Admin | Customer User |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✗ | ✓ |
| Customers | ✓ | ✓ | ✓ | ✗ |
| Support | ✓ | ✓ | ✓ | ✓ |
| Planned Data Upload | ✓ | ✓ | ✓ | ✗ |
| Planned vs Actual | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ (read-only) |
| Alerts | ✓ | ✓ | ✓ | ✓ |
| Administration | ✓ | ✓ | ✗ | ✗ |

### Reports Access

`Customer User` role sees a **read-only** report table scoped to their own `customer` ID. All other roles can edit and save data.

---

## 7. Database Models

All models use Sequelize 6 with PostgreSQL. UUIDs are used as primary keys unless noted.

---

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `username` | STRING | Unique, required |
| `email` | STRING | Unique, required |
| `phone_number` | STRING | Optional |
| `name` / `surname` | STRING | Optional |
| `password` | STRING | `scrypt:hash:salt` format |
| `ammp_api_key` | STRING | Per-user AMMP key; overrides global env key |
| `customer` | STRING | UUID reference to `customers.id` |
| `roles` | ARRAY(JSON) | Array of `{ name, isAssigned }` objects |
| `timezone` | STRING | Optional |
| `is_locked_out` | BOOLEAN | Locked out flag |
| `lockout_until` | DATE | When lockout expires |
| `failed_login_attempts` | INTEGER | Default 0; resets on success |
| `not_active` | BOOLEAN | Soft-disable account |
| `email_confirmed` | BOOLEAN | |
| `totp_enabled` | BOOLEAN | Default false |
| `totp_secret` | STRING | AES-256-GCM encrypted TOTP secret |
| `totp_temp_secret` | STRING | Temp secret during 2FA setup flow |
| `created_at` / `updated_at` | DATE | |

**Associations:** `User.hasMany(SupportQuery)`

---

### `customers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `company_name` | STRING | Required, 1–255 chars |
| `logo_file_name` | STRING | Optional |
| `users` | ARRAY(JSON) | Embedded user reference array |

---

### `user_roles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | STRING | e.g., `Admin` |
| `normalized_name` | STRING | e.g., `ADMIN` |
| `btn_tags` | ARRAY(TEXT) | UI labels e.g., `['Public']` |

---

### `reports`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | STRING | |
| `file_name` | STRING | Required |
| `site_id` | STRING | Required |
| `concurrency_stamp` | STRING | Required |

---

### `report_data`

Stores daily per-site solar hybrid report entries. One row = one day.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `customer_id` | STRING | Optional |
| `site_id` | STRING | Required |
| `report_month` | INTEGER | 1–12 |
| `report_year` | INTEGER | |
| `day` | INTEGER | 1–31 |
| `total_daily_consumption` | DOUBLE | kWh |
| `total_daytime_consumption` | DOUBLE | kWh (7AM–5PM) |
| `planned_daytime_consumption` | DOUBLE | kWh |
| `pv_production` | DOUBLE | kWh |
| `planned_pv_production` | DOUBLE | kWh |
| `energy_production_turbine` | DOUBLE | kWh |
| `energy_production_diesel_generator` | DOUBLE | kWh |
| `daily_daytime_solar_displacement` | STRING | |
| `total_solar_displacement` | STRING | |
| `data_capture_daytime` | STRING | |
| `data_capture_entire_day` | STRING | |
| `remarks` | TEXT | |
| `planned_monthly_kwh` | DOUBLE | |

---

### `power_production_plans`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `file_name` | STRING | Display name |
| `note` | STRING | Optional note |
| `unique_file_name` | STRING | Required, unique S3 key |
| `power_production_plan_items` | ARRAY(JSON) | Embedded items |
| `creator_id` / `last_modifier_id` | UUID | Optional user references |

---

### `power_production_plan_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `power_production_plan_id` | UUID | FK to `power_production_plans` |
| `site_id` | STRING | Required |
| `expected_value` | DOUBLE | Required |
| `month` | INTEGER | 1–12 |
| `year` | INTEGER | |

---

### `site_details`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `site_id` | STRING | Required |
| `year` | INTEGER | |
| `january` … `december` | DOUBLE | Monthly expected PV values |

---

### `support_queries`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `title` | STRING | 3–100 chars |
| `description` | STRING | 3–1200 chars |
| `user_id` | UUID | FK to `users` |
| `category_id` | UUID | FK to `support_query_categories` |
| `status_id` | UUID | FK to `support_query_statuses` |
| `customer` | STRING | Company name snapshot |

**Associations:** `belongsTo(User)`, `hasMany(SupportQueryMessage)`

---

### `support_query_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `message` | STRING | Required |
| `user_id` | UUID | FK to `users` |
| `support_query_id` | UUID | FK to `support_queries` |

**Associations:** `belongsTo(SupportQuery)`, `belongsTo(User)`

---

### `support_query_categories`

Seeded values: `PowerOrService`, `ReportsAndPerformanceMeasurement`, `PaymentAndInvoicing`, `Other`

---

### `support_query_statuses`

Seeded values: `New`, `Active`, `Resolved`, `Reopened`

---

### `user_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | STRING (PK) | Lucia session ID |
| `expires_at` | DATE | 1 hour from creation |
| `user_id` | UUID | FK to `users` |

---

### `verification_codes`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID | Unique; one code per user |
| `code` | STRING | 6-digit OTP or UUID token (for password reset) |
| `expires_at` | DATE | 10 minutes from creation |

---

### `audit_logs`

Fields: `sequence_id`, `name`, `user_name`, `correlation_id`, `client_ip_address`, `url`, `has_exception`, `duration`, `http_request`, `extra_properties`

---

### `security_logs`

Fields: `sequence_id`, `application_name`, `identity`, `action`, `user_id`, `user_name`, `tenant_name`, `client_id`, `correlation_id`, `client_ip_address`, `browser_info`, `creation_time`, `extra_properties`, `concurrency_stamp`

---

### `text_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | STRING | Template key |
| `display_name` | STRING | |
| `inline_localized` | BOOLEAN | |
| `content` | TEXT | HTML email content |

**Seeded templates:**
- `Account.EmailConfirmationLink`
- `Account.EmailSecurityCode`
- `Account.PasswordResetLink`
- `StandardEmailTemplates.Layout`
- `StandardEmailTemplates.Message`

---

## 8. API Routes

These are Next.js Route Handlers under `app/api/`. They act as a **BFF (backend-for-frontend) proxy** — they authenticate the current user, resolve their AMMP token server-side, call the AMMP API, and return the data to the browser without exposing tokens to the client.

All three routes:
- Require a valid session (return `401` if not authenticated)
- Resolve the user's per-user `ammp_api_key` via `getAmmpToken(userId)`
- Return `400` if required query params are missing
- Return `500` if the AMMP token request fails

---

### `GET /api/ammp/historic-power`

Fetches historic power time-series data (PV power, consumption, grid/external power).

**Query Parameters:**

| Param | Required | Default | Description |
|---|---|---|---|
| `assetId` | Yes | — | AMMP asset ID |
| `dateFrom` | Yes | — | ISO 8601 start datetime |
| `dateTo` | Yes | — | ISO 8601 end datetime |
| `interval` | No | `15m` | Time bucket: `5m`, `15m`, `1h`, etc. |

**Response:** Raw AMMP response — object with fields:
- `pv_power.data[]` — `{ date, value }` array (watts)
- `consumption_power.data[]`
- `external_power.data[]` or `power_from_grid.data[]`

---

### `GET /api/ammp/historic-battery`

Fetches historic battery charge/discharge and state-of-charge data.

**Query Parameters:**

| Param | Required | Default | Description |
|---|---|---|---|
| `assetId` | Yes | — | AMMP asset ID |
| `dateFrom` | Yes | — | ISO 8601 start datetime |
| `dateTo` | Yes | — | ISO 8601 end datetime |
| `interval` | No | `15m` | Time bucket |

**Response:** Raw AMMP response — object with fields:
- `battery_soc.data[]` — State of Charge (%)
- `battery_charge_power.data[]` — Watts
- `battery_discharge_power.data[]` — Watts

---

### `GET /api/ammp/historic-kpi`

Fetches KPI/performance data (actual vs expected PV power, performance ratio).

**Query Parameters:**

| Param | Required | Default | Description |
|---|---|---|---|
| `assetId` | Yes | — | AMMP asset ID |
| `dateFrom` | Yes | — | ISO 8601 start datetime |
| `dateTo` | Yes | — | ISO 8601 end datetime |
| `interval` | No | `1h` | Time bucket: `1h`, `1d`, `1M` |

**Response:** Raw AMMP response — may include:
- `pv_power.data[]` or `actual_pv_power.data[]`
- `expected_pv_power.data[]` or `irradiance_power.data[]` or `theoretical_power.data[]`
- `performance_ratio.data[]` — fraction (0–1) or percentage (0–100)

---

## 9. Application Pages

### Public Pages

#### `/` and `/login`
Login form. Two-step:
1. User enters email + password
2. If 2FA enabled: TOTP input rendered inline
3. If no 2FA: redirected to `/verify` for email OTP

Displays lockout message if account is locked.

---

#### `/verify`
Email OTP verification. User enters the 6-digit code sent to their email. Code expires in 10 minutes. On success, session is created and user is redirected to `/dashboard`.

---

#### `/2FAVerification`
Standalone TOTP verification page. Used as an alternative to the inline TOTP flow.

---

#### `/forgot-password`
Email input form. Sends a password reset link to the user's email.

---

#### `/reset-password/[token]`
Password reset form. `token` param is a UUID stored in `verification_codes`. On submit, hashes the new password, saves it, and deletes the code.

---

### Protected Pages

#### `/dashboard`
- **Auth required:** Yes
- **Component:** `DashboardScreen`
- **Data:** Fetches all AMMP assets for the user's API key. If the asset count is within `ServiceConstants.MaxAssets`, it also fetches aggregate historic energy and most-recent live data.
- **Displays:** Asset cards with live power readings, aggregate solar production, CO₂ reduction, trees saved, car distance saved.

---

#### `/Assets/Details/[slug]`
- **Auth required:** Yes
- **Param:** `slug` = AMMP `asset_id`
- **Component:** `AssetDetailsScreen`
- **Data (parallel fetch):**
  - `getTodaysEnergy(token, asset_id)` — today's energy, CO₂, % solar
  - `getAssetDevices(token, asset_id)` — detects battery/genset presence
  - `getHistoricAssetPowerData(...)` — today's 15m power data (for `PowerLineChart`)
  - `getHistoricKpiData(...)` — last 7 days 1h KPI data (for `PerformanceLineChart`)
  - `getHistoricBatteryData(...)` — conditional, only if site has battery device
- **Charts displayed:**
  - **Power Sources** (`PowerLineChart`) — PV, Consumption, Grid power with date + interval controls
  - **Battery System** (`BatteryChart`) — Charge/Discharge power + SOC % (conditional)
  - **Generator Output** (`GensetChart`) — Genset power (conditional)
  - **Performance — Expected vs Actual** (`PerformanceLineChart`) — Actual PV, Expected PV, Performance Ratio with date range controls

---

#### `/reports`
- **Auth required:** Yes
- **Component:** `ReportsScreen` → `EditableReportTable`
- **Customer User:** Read-only, scoped to their customer ID
- **Admin roles:** Full edit access across all customers/sites
- **Features:**
  - Select customer, site, month, year
  - Inline-editable table (one row per day of the month)
  - Columns: daily consumption, daytime consumption, PV production, planned PV, genset energy, turbine energy, solar displacement, data capture %, remarks
  - **Load from DB** — fetches saved `report_data` records
  - **Upload XLSX** — parses Excel file to populate table
  - **Download Template** — downloads empty XLSX template
  - **Save** — upserts all rows to `report_data` table

---

#### `/planned-data-upload`
- **Auth required:** Yes
- **Component:** `PlannedUploadsScreen` → `PlannedMainDataTable`
- **Features:**
  - Upload Excel files containing planned monthly PV production per site
  - View uploaded plans in a table
  - Delete plans
  - Plans stored as `power_production_plans` with child `power_production_plan_items`

---

#### `/planned-vs-actual`
- **Auth required:** Yes
- **Component:** `PlannedVsActualScreen` → `PlannedVsActualChart`
- **Features:**
  - Select site (from AMMP asset list) and date range
  - Chart compares:
    - **Planned** PV production (from `power_production_plan_items`)
    - **Actual** PV energy (from AMMP `getHistoricAssetEnergyData`)
  - Aggregated by month

---

#### `/alerts`
- **Auth required:** Yes
- **Component:** `AlertsScreen` → `AlertsTable`
- **Features:**
  - Select AMMP asset and date range
  - Fetches status/info log from AMMP `getAssetStatusInfoLog`
  - Displays timestamped alert events in a table

---

#### `/support`
- **Auth required:** Yes
- **Features:**
  - View all support queries (filtered by user for Customer role)
  - Create new support query (title, description, category)
  - View ticket detail with message thread

---

#### `/profile`
- **Auth required:** Yes
- **Tabs:**
  1. **Change Password** — current password + new password (validated)
  2. **Personal Info** — name, surname, phone number, timezone
  3. **Authenticator App** — Enable 2FA (shows QR code), confirm with OTP, or disable 2FA

---

#### `/customers`
- **Auth required:** Yes (Admin, Daystar Portal Admin, Daystar Customer Admin)
- **Features:** Create, view, edit, delete customers. Customer table with company name, logo.

---

#### `/admin/identity/users`
- **Auth required:** Admin / Daystar Portal Admin
- **Features:**
  - Full user table (15 columns including roles, lockout status, AMMP key indicator)
  - Search by name/email/username
  - Create user (modal)
  - Edit user (roles, customer, active status, AMMP API key)
  - Import users from XLSX
  - Export users to XLSX
  - Pagination (5 per page)

---

#### `/admin/identity/roles`
- **Auth required:** Admin / Daystar Portal Admin
- **Features:** View and manage roles in `user_roles` table

---

#### `/admin/identity/security-logs`
- **Auth required:** Admin / Daystar Portal Admin
- **Features:** Read-only security event log table

---

#### `/admin/audit-logs`
- **Auth required:** Admin / Daystar Portal Admin
- **Features:** Read-only audit log table

---

#### `/admin/text-templates`
- **Auth required:** Admin / Daystar Portal Admin
- **Features:** View and edit email templates (HTML content stored in `text_templates`)

---

#### `/admin/settings`
- **Auth required:** Admin / Daystar Portal Admin
- **Features:** System-level settings

---

## 10. Controllers

Each domain has individual controller files per operation (one function per file). All controllers use the Sequelize singleton from `db_connection.js`.

### Users (`lib/controllers/users/`)

| File | Operation |
|---|---|
| `AddUser.js` | Creates new user with hashed password |
| `getAllUsers.js` | Returns all users with associated roles |
| `getUserById.js` | Returns user by UUID |
| `getUserByEmail.js` | Returns user by email (for auth) |
| `updateUserById.js` | Updates user fields |
| `deleteUserById.js` | Deletes user |
| `changePassword.js` | Verifies current password, sets new hashed password |
| `updateProfile.js` | Updates name, surname, phone, timezone |
| `updateUserPasswordById.js` | Admin password reset for a user |
| `importExcel.js` | Parses XLSX file and bulk-creates users |
| `startEnable2FA.js` | Generates TOTP secret + QR code, stores as `totp_temp_secret` |
| `confirmEnable2FA.js` | Validates first TOTP, promotes temp to permanent secret |
| `verify2FA.js` | Validates TOTP at login time |
| `disable2FA.js` | Verifies password, clears TOTP fields |
| `verifyToken.js` | Validates UUID-based tokens (password reset) |

### Customers (`lib/controllers/customers/`)

| File | Operation |
|---|---|
| `AddCustomer.js` | Create customer |
| `getAllCustomers.js` | List all customers |
| `getCustomerById.js` | Get single customer |
| `updateCustomerById.js` | Update customer |
| `deleteCustomerById.js` | Delete customer |
| `AddUserToCustomerUserArray.js` | Appends user reference to customer's users array |

### Reports (`lib/controllers/report/` and `lib/controllers/reportData/`)

| File | Operation |
|---|---|
| `getReportData.js` | Fetches `report_data` records by site, month, year |
| `saveReportData.js` | Upserts daily report rows (findOrCreate + update) |
| `getAssetsByCustomer.js` | Calls AMMP API using the customer's user's `ammp_api_key` to fetch their assets |
| `getDistinctSites.js` | Returns unique `site_id` values from `report_data` |

### Planned Production (`lib/controllers/powerProductionPlan/` and `powerProductionPlanItem/`)

| File | Operation |
|---|---|
| `AddPowerProductionPlan.js` | Create plan record |
| `getAll.js` | List all plans |
| `getById.js` | Get plan by ID |
| `update.js` | Update plan |
| `delete.js` | Delete plan |
| `addPowerProductionPlanItem.js` | Add item (site, month, year, expected_value) |
| `getPlannedVsActualData.js` | Queries items by site + month/year range for chart overlay |

### Alerts (`lib/controllers/alerts/`)

| File | Operation |
|---|---|
| `getAssetAlerts.js` | Calls `AmmpServices().getAssetStatusInfoLog(token, assetId, from, to)` |

### Support (`lib/controllers/supportQuery/`)

Full CRUD: `AddSupportQuery`, `getAllSupportQueries`, `getSupportQueryById`, `updateSupportQuery`, `deleteSupportQuery`, `ResolveSupportQueryById`

Also: `supportQueryCategory/`, `supportQueryMessage/`, `supportQueryStatus/` — each with full CRUD

### Auth-related (`lib/controllers/`)

| File | Operation |
|---|---|
| `mail/verificationCode.js` | `createVerificationCode`, `createLink`, `verifyCode`, `cleanupExpiredCodes` |

---

## 11. Services

### `lib/services/ammp/AmmpServices.js`

See [Section 12](#12-ammp-external-api-integration) for full AMMP method details.

**Key computation methods (no network calls):**

| Method | Description |
|---|---|
| `calculateCo2Reduction(pvEnergyWh)` | CO₂ (kg) = PV / 1000 × 0.5543; Trees = CO₂ / 38.85; CarDistance (km) = CO₂ / 0.15 |
| `calculatePowerGeneration(mostRecentData)` | Extracts solar, genset, grid power from most-recent reading; calculates % solar |
| `calculatePercentageElectricityContributedBySolar(historicData, pvEnergy)` | Solar / total consumption × 100 |
| `calculateHistoricPvEnergyTotalDays(from, to)` | Number of days between two dates |
| `setTodayFields(TodayPowerData)` | Sums today's pv/genset/grid power from historic-power data |

---

### `lib/services/ammp/getAmmpToken.js`

Convenience wrapper used by all server-side pages and API routes:

```js
const { access_token } = await getAmmpToken(userId);
```

Internally:
1. Calls `getUserById(userId)` to read `user.ammp_api_key`
2. Calls `AmmpServices().getAuthToken(ammp_api_key || null)`
3. Falls back to `process.env.AMMP_API_KEY` if no per-user key

---

### `lib/services/mail/sendMail.js`

```js
await sendMail({ type: 'VERIFICATION_CODE', to: email, code: '123456' });
await sendMail({ type: 'PASSWORD_RESET', to: email, link: 'https://...' });
```

Uses SendGrid `@sendgrid/mail`. `FROM_EMAIL` env var used as sender.

---

## 12. AMMP External API Integration

**Base URL:** `https://data-api.ammp.io`

**Authentication:** API key → JWT bearer token exchange.  
Each user can have their own `ammp_api_key` stored in the database. If not set, the global `process.env.AMMP_API_KEY` is used as a fallback.

---

### `POST /v1/token`

Exchange an API key for a JWT bearer token.

**Request Headers:**
```
x-api-key: {api_key}
Content-Type: application/json
Accept: application/json
```

**Response:**
```json
{ "access_token": "eyJ..." }
```

The token payload (`parseJwt`) contains an `exp` field (UNIX timestamp). Token is **not cached** — re-requested on every server-side render.

---

### `GET /v1/assets`

Returns all assets the API key has access to.

**Response:** Array of asset objects.

---

### `GET /v1/assets/{assetId}`

Returns metadata for a single asset including `asset_id`, `long_name`, site configuration.

---

### `GET /v1/assets/{assetId}/devices`

Returns device list. Used to detect:
- `device_type: "battery-system"` → show `BatteryChart`
- `device_type: "genset"` → show `GensetChart`

---

### `GET /v1/assets/{assetId}/most-recent`

Returns current/latest readings for the site.

**Key fields returned:**
- `pv_power.value` — Current solar power (W)
- `genset_power.value` — Genset power (W)
- `external_power.value` or `power_from_grid.value` — Grid power (W)
- `consumption_power.value` — Total consumption (W)
- `pv_energy_today.value` — Today's solar energy (Wh)
- `consumption_energy_today.value`
- `genset_energy_today.value`
- `energy_from_grid_today.value`
- `energy_to_grid_today.value`

---

### `GET /v1/assets/{assetId}/historic-energy`

**Query params:** `date_from`, `date_to`, `interval` (default `1d`)

**Key fields returned (each with `.data[{ date, value }]`):**
- `pv_energy` — Solar energy (Wh)
- `energy_from_grid`
- `genset_energy`
- `consumption_energy`
- `external_energy`

---

### `GET /v1/assets/{assetId}/historic-power`

**Query params:** `date_from`, `date_to`, `interval` (default `1h`)

**Key fields returned:**
- `pv_power.data[]`
- `genset_power.data[]`
- `external_power.data[]` or `power_from_grid.data[]`
- `consumption_power.data[]`

---

### `GET /v1/assets/{assetId}/historic-battery-data`

**Query params:** `date_from`, `date_to`, `interval` (default `15m`)

**Key fields returned:**
- `battery_soc.data[]` — State of charge (%)
- `battery_charge_power.data[]` — W
- `battery_discharge_power.data[]` — W

---

### `GET /v1/assets/{assetId}/historic-kpi-data`

**Query params:** `date_from`, `date_to`, `interval` (default `1h`)

**Key fields returned (field names vary by site config):**
- `pv_power.data[]` or `actual_pv_power.data[]` — Actual production
- `expected_pv_power.data[]` or `irradiance_power.data[]` or `theoretical_power.data[]` — Expected production
- `performance_ratio.data[]` — Can be 0–1 (fraction) or 0–100 (percentage); normalized to 0–100 in the chart

---

### `GET /v1/assets/{assetId}/status-info-log`

**Query params:** `date_from`, `date_to`

Returns an array of status/alert events. Each entry has a timestamp and event description.

---

## 13. Email Service

**Provider:** SendGrid  
**Config:** `SENDGRID_API_KEY`, `FROM_EMAIL` env vars

### Email Types

#### Verification Code (login OTP)
- **Trigger:** Successful password login (when 2FA is not TOTP-enabled)
- **Content:** Styled HTML with 6-digit code and 10-minute expiry notice
- **Template key:** `Account.EmailSecurityCode`

#### Password Reset Link
- **Trigger:** User submits forgot-password form
- **Content:** Styled HTML with clickable reset link
- **Link format:** `{NEXT_PUBLIC_BASE_URL}/reset-password/{uuid-token}`
- **Template key:** `Account.PasswordResetLink`

---

## 14. AWS S3 Integration

**Packages:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`  
**Region:** `eu-west-1` (hardcoded in `utils/constants.js`)  
**Config:** `BUCKET_NAME`, `BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY`, `BUCKET_SESSION_TOKEN`

S3 is intended for storing uploaded files (planned data Excel files, customer logos). The `unique_file_name` field in `power_production_plans` represents the S3 object key.

---

## 15. UI Components

### Charts (`components/ui/charts/`)

All charts use Chart.js with `react-chartjs-2` and share `chart.module.css` for responsive styling.

| Component | Data Source | Controls | Description |
|---|---|---|---|
| `PowerLineChart` | `/api/ammp/historic-power` | Date picker, interval (15m/1h) | PV power, consumption, grid power line chart |
| `BatteryChart` | `/api/ammp/historic-battery` | Date picker, interval (15m/1h) | Charge power, discharge power (left axis) + SOC% (right axis) |
| `GensetChart` | `/api/ammp/historic-power` | Date picker, interval (15m/1h) | Genset power only |
| `PerformanceLineChart` | `/api/ammp/historic-kpi` | Date range pickers, interval (1h/1d/1M) | Actual vs expected PV power + performance ratio |
| `PlannedVsActualChart` | `getPlannedVsActualData` + AMMP | Site picker, date range | Monthly planned vs actual bar chart |
| `HalfDonutChartComponent` | Prop value (0–100) | None | Half-donut showing % electricity from solar |
| `DonutChartComponent` | Props | None | Full donut for dashboard energy mix |
| `ProgressBarChartComponent` | `progressData` prop | None | Horizontal bars for solar/grid/genset energy breakdown |

### Tables (`components/ui/tables/`)

All tables have `overflow-x: auto` and `min-width` so they scroll horizontally on mobile.

| Table | Domain |
|---|---|
| `UsersMainDataTable` | Users (15 columns, paginated 5/page) |
| `CustomerMainDataTable` | Customers |
| `ReportMainDataTable` | Report plans |
| `EditableReportTable` | Per-day editable report data |
| `PlannedMainDataTable` | Uploaded planned production plans |
| `AlertsTable` | AMMP site alerts |
| `AuditLogTable` | Audit logs |
| `SecurityLogMainDataTable` | Security logs |
| `SupportMainDataTable` | Support queries |

### Modals (`components/ui/modals/`)

All modals use native `<dialog>` element with `showModal()` / `.close()`.  
Shared styles in `components/ui/modals/sharedModal.module.css`.

| Modal | Purpose |
|---|---|
| `CreateUsersModal` | Create new user with roles and customer assignment |
| `UserActions` | Edit user, set password, delete user (tabbed modal) |
| `CreateCustomerModal` | Create new customer |
| `CreateSupportQueryModal` | Submit support ticket |

### Layout (`components/Layout/`)

`MainAppLayout.js` wraps all protected pages. Features:
- Collapsible left sidebar (hover to expand when collapsed)
- Mobile: sidebar becomes a fixed overlay (slide-in drawer), toggled via floating hamburger button
- Dim overlay closes the sidebar on mobile tap
- Breakpoints: ≤1024px (tablet), ≤768px (mobile)

---

## 16. Navigation & Routing

### Sidebar Navigation Items

```
Dashboard              → /dashboard
Customers              → /customers
Support                → /support
Planned Data Upload    → /planned-data-upload
Planned vs Actual      → /planned-vs-actual
Reports                → /reports
Alerts                 → /alerts
Administration ▾
  Identity Management ▾
    Roles              → /admin/identity/roles
    Users              → /admin/identity/users
    Security Logs      → /admin/identity/security-logs
  Text Templates       → /admin/text-templates
  Audit Logs           → /admin/audit-logs
  Settings             → /admin/settings
```

### Routes Excluded from Main Layout

The following paths render without the sidebar/navbar (full-screen auth pages):

`/`, `/login`, `/verify`, `/2FAVerification`, `/forgot-password`, `/reset-password/*`, `/403`, `/404`

---

## 17. Running the Application

### Prerequisites

- Node.js ≥ 18
- PostgreSQL database
- `.env` file (see [Section 4](#4-environment-variables))

### Install Dependencies

```bash
npm install
```

### Run Database Migrations

```bash
npm run migrate
```

### Seed the Database

```bash
npm run seed
```

This seeds:
- User roles (Admin, Daystar Portal Admin, Daystar Customer Admin, Customer User)
- Support query categories and statuses
- Email text templates
- Default admin user

### Development Server

```bash
npm run dev
```

Runs at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t customer-portal .
docker run -p 3000:3000 --env-file .env customer-portal
```

### Database CLI Commands

```bash
npm run migrate:rollback        # Rollback last migration
npm run migrate:rollback:all    # Rollback all migrations
npm run migrations:create       # Create new migration file
```

---

*End of Documentation*
