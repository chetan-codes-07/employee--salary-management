# Compensation data
The employees table holds the current directory. Each row represents one fictional employee and their current annual base salary. The local migration runner also tracks applied filenames in schema_migrations.

| Column | SQLite type | Contract |
| --- | --- | --- |
| id | TEXT | Primary key, EMP-00001 through EMP-10000 in the seed |
| name | TEXT | Required display name, duplicates allowed |
| department | TEXT | Required directory filter |
| country | TEXT | Required, paired with currency by a check constraint |
| currency | TEXT | INR for India, USD for United States, GBP for United Kingdom, EUR for Germany |
| salary_minor | INTEGER | Required integer from 1 to 10,000,000,000 inclusive |
| revision | INTEGER | Required, initially zero, incremented on salary and profile edits |
| job_title | TEXT | Display title. Empty values are filled from the employee code on startup |
| email | TEXT | Fictional address derived from the name |
| level | TEXT | L1 through L6 |
| status | TEXT | Active or Inactive |
| hired_on | TEXT | ISO date |

`salary_history` stores each annual base amount, its effective date, and the reason. The latest row matches the employee’s current salary. A USD figure is calculated for display from fixed fictional rates dated 15 Nov 2026 and is never stored or added into a currency total.

The compound country/department index supports country-only and combined filters. The department index supports department-only lookups. Order pages by stable ID. Group sums by currency and round the per-person average to the nearest minor unit only after division.

## Change and recovery
Edit db/schema.ts, run `npm run db:generate`, and inspect the generated SQL and metadata. Commit a new migration for each change to an applied schema. Local setup applies outstanding migrations transactionally. Sites applies hosted migrations during deployment. Use a corrective migration for a released schema and verify a backup before any destructive change.

## Seed and access
Run `npm run seed` twice on a fresh local database. Each run must finish with 10,000 records. The generator fixes the seed and IDs. A conflict on ID preserves the existing record. The UI supports salary updates, employee creation, CSV import, and employee removal (history rows are deleted with the employee). Database connections belong to the server. See [security](SECURITY.md).

## Write integrity

IDs through EMP-10000 belong to the deterministic fixture. The allocator reads the greatest existing ID and the persisted high-water mark inside the inserting statement. Deleting an employee also records the issued number. A single SQLite statement changes the salary and records its history through a trigger. Reading a profile only reads data. Legacy rows with missing history show their current balance, and the next raise records that opening balance before the new salary.

The browser splits each CSV into batches of 100. Each batch writes employees and a receipt in one transaction. The receipt identifies the file fingerprint and row offset, and contains a digest of the submitted rows. Selecting the same file resumes safely after an interrupted upload. Changing the file starts a new import.
