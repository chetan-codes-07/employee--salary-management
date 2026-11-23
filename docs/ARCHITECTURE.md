# Architecture
React 19 renders the directory and editor. Express 5 owns the API. TypeScript checks both. Vite builds the client. SQLite supplies the relational store locally and through Cloudflare D1 on Sites. The hosted database persists independently of application releases.

## Ownership
- `src/` contains browser code. Components issue same-origin HTTP requests.
- `server/app.ts` wires Express routes, JSON boundaries and error responses.
- `server/employees.ts` owns filters, paging, group totals, chart breakdowns and salary updates. `server/money.ts` converts decimal input to integer minor units.
- `server/local.ts` serves the built client and API using file-backed SQLite. `server/worker.ts` adapts the same application to D1 and serves bundled client assets. `/employees` returns the same client shell as `/` so a refresh stays on the directory.
- `db/` describes the schema, `drizzle/` holds versioned SQL, and `scripts/` contains build and seed entry points.

## Salary save
The editor submits a decimal string and the employee revision to PATCH /api/employees/:id/salary. Express validates the request. SQLite matches both ID and revision in one update, increments the revision, and returns the saved row. A stale revision produces HTTP 409. The intended UI then reads the directory and currency summaries again. Both reads use server-side filters, and summaries aggregate the entire matching population.

## Deployment
Build the React client and Worker from the committed source. Sites applies schema migrations and binds D1 as DB. Seed separately from migrations so redeployment preserves edits. A live health response verifies database connectivity. Employee editing and reporting need their own release checks. See [implementation decisions](DECISIONS.md).
