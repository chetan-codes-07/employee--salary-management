# ACME Compensation

HR demo for finding a fictional employee, updating annual base salary, and reviewing group compensation.

Made by [chetangehlot](https://chetangehlot.com).

## Setup

```bash
npm ci
cp .env.example .env
# Set HR_EMAIL and HR_PASSWORD in .env before starting the server.
npm run seed
npm run build
npm run dev
```

Open http://localhost:3000.

## HR sign-in
Set `HR_EMAIL` and `HR_PASSWORD` in the local, gitignored `.env` before starting Express. Local development accepts a nonempty demo password. Use a unique password of at least 16 characters for hosted or production use (generate one with `openssl rand -hex 24`). Configure those same keys as private environment variables when deploying the Worker. The service stops at startup with a configuration error if either setting is invalid. Each browser signs in once per eight-hour session. Sign out in the dashboard header. Rotating either credential and restarting the service invalidates previous sessions.

Direct links to employee pages show the login form first, then open the requested page. `SEED_TOKEN` is a separate credential for the seed API.

## Verify

Run `npm test`, `npm run lint`, and `npm run build`. Run `npm run seed` twice to check the 10,000 reserved fixture IDs. Additional employees and existing salary edits survive reruns.

The directory accepts CSV files with up to 10,000 employees and 8 MB of data. Required headers are `name,job title,department,country,level,salary`. If an upload is interrupted, select the same unmodified file again. A changed file counts as a separate import.

## Vercel and Turso

Vercel serves the React build from `dist/client` and routes `/api/*` to the Express application bundled into `api/index.js` from `server/vercel-api.ts`. Import this GitHub repository into Vercel. The checked-in `vercel.json` selects the Vite framework and `npm run build:vercel`. Use Node.js 22.13 or newer.

Create a Turso **libSQL** database and set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your private local environment. Run `npm run db:prepare:turso` to apply the migrations and seed 10,000 fixtures. The command preserves salary edits and additional employees on reruns. Database preparation is a separate release step so preview builds do not change the production database.

Add the following private environment variables to the Vercel project before deploying.

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `HR_EMAIL`
- `HR_PASSWORD` with at least 16 characters
- `SEED_TOKEN` if the authenticated seed API is needed

Preview deployments should use a separate Turso database. Salary edits on a deployment affect whichever database its environment variables select. The local SQLite database and its existing additions remain local. The hosted seed creates a fresh fictional dataset.

After deployment, add `salary.chetangehlot.com` under the project's Domains settings. Copy Vercel's exact CNAME target into the DNS zone for `chetangehlot.com`, using `salary` as the record name. Verify the domain and HTTPS certificate in Vercel. The authoritative nameservers observed on 23 November 2026 were `ns1.hosting.businessidentity.llc` and `ns2.hosting.businessidentity.llc`.
