# Implementation decisions

- **One workflow:** employee search → annual salary edit → same-filter currency summaries. Scope and acceptance criteria were committed before implementation (`a1cd326`).
- **Relational persistence:** hosted Cloudflare D1 is durable SQLite, separate from Worker deployments; local development and tests use better-sqlite3. Sites provisions D1 and applies schema-only Drizzle migrations. This avoids ephemeral filesystem storage and a second service.
- **Same Express application:** local Node HTTP server and the official Cloudflare Node HTTP adapter share routing, validation and SQL services. React assets and API ship as one Worker. Reference: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/ (checked 2026-11-23).
- **No FX arithmetic:** all four currencies have two minor digits. Each summary stays in its original currency, and every period is annual base salary. There is no mixed-currency total.
- **Timebox:** start 11:39 IST; aim for deployed complete workflow by 15:39, submit by 17:39; buffer to 18:39. Finish sooner if validation and deliverables are complete.
