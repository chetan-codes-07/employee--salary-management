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
