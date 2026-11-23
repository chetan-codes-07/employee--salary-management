# Compensation data
The application has one business table, employees. Each row represents one fictional employee and their current annual base salary. The local migration runner also tracks applied filenames in schema_migrations.

| Column | SQLite type | Contract |
| --- | --- | --- |
| id | TEXT | Primary key, EMP-00001 through EMP-10000 in the seed |
| name | TEXT | Required display name, duplicates allowed |
| department | TEXT | Required directory filter |
| country | TEXT | Required, paired with currency by a check constraint |
| currency | TEXT | INR for India, USD for United States, GBP for United Kingdom, EUR for Germany |
| salary_minor | INTEGER | Required integer from 1 to 10,000,000,000 inclusive |
| revision | INTEGER | Required, initially zero, incremented on salary edits |

The compound country/department index supports country-only and combined filters. The department index supports department-only lookups. Order pages by stable ID. Group sums by currency and round the per-person average to the nearest minor unit only after division.

## Change and recovery
Edit db/schema.ts, run `npm run db:generate`, and inspect the generated SQL and metadata. Commit a new migration for each change to an applied schema. Local setup applies outstanding migrations transactionally. Sites applies hosted migrations during deployment. Use a corrective migration for a released schema and verify a backup before any destructive change.

## Seed and access
Run `npm run seed` twice on a fresh local database. Each run must finish with 10,000 records. The generator fixes the seed and IDs. A conflict on ID preserves the existing record. The UI supports salary updates. Employee creation and deletion are outside the assessment. Database connections belong to the server. See [security](SECURITY.md).
