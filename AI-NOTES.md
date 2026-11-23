# AI collaboration record

This application was built with Codex. The user supplied the assessment and explicitly narrowed the product to “find an employee, update their salary, and see how that change affects pay figures for their country or department.” They required a six-hour budget, early deployment, 10,000 deterministic fictional employees, minor-unit money, currency-separated reporting and genuine incremental commits.

## Actual prompts and decisions

1. User: “The first step is the requirements document—then build and commit in small, reviewable stages.” Accepted: requirements were written before any application code and committed as `Define HR workflow, scope, and acceptance criteria`.
2. User: “Serve the React build and API from one service to simplify deployment. SQLite is suitable if the host provides persistent storage.” Chose durable D1 SQLite via Sites rather than unverified filesystem SQLite or introducing PostgreSQL infrastructure. Checked the official Cloudflare Express/D1 tutorial before selecting the Node HTTP adapter. Local Node and hosted Worker share Express routes and SQL behavior.
3. User: “increase one INR salary by ₹10,000, refresh, and show that the filtered INR total rose by exactly ₹10,000.” This is the central demo and verification scenario. No cross-currency total or exchange-rate assumption is introduced.

## Review policy

AI-generated code must pass TypeScript checks, deterministic tests and a production build. Money tests use explicit expected integer values; reporting tests will use hand-calculated fixtures rather than derive expected results from implementation. Deployment and submission evidence is recorded only after each action succeeds. AI assistance is disclosed rather than presented as unaided authorship.

The user asked for shadcn Skeleton while pay figures and the directory load, and shadcn Card for the annual base totals. The currency table became four cards. The employee list still uses Table.

The user asked to unslop the dashboard with https://github.com/heydamir/unslop and to use shadcn/ui instead of custom controls. Rebuilt the screen from Button, Input, NativeSelect, Field, Table, Dialog, Alert, Separator and Spinner. Removed the hand-written control stylesheet. Direction: a graphite compensation ledger, mono figures, teal only on save and focus.

The user asked to use Taste Skill (`design-taste-frontend` 2.5.1 from tasteskill.dev) for this project’s UI. Applied its application-screen rules — one accent, sentence case, 44px buttons with hover and press, equal edges, loaded Inter — on the existing compensation dashboard. The skill’s marketing-page plan (hero, photographs, one section per viewport, gate.mjs) was not run, because it would replace the HR workflow.

The user asked to drop any documented env switch that could hide the author badge, so others are not guided to disable it.

The user asked to remove employees from the directory and detail pages, with confirmation before delete.

The user asked to raise CSV import to 10,000 employees and show success or error feedback in a top-right toast.

The user asked for ESLint and Prettier. ESLint uses the flat config with TypeScript and the classic React Hooks rules. Prettier is available through `npm run format` and was not applied to existing source.

The user asked to keep `src/main.tsx` under about 100 lines. Routing moved to `route.ts`, the shell to `App.tsx`, and the nav to `AppSidebar.tsx`; `main.tsx` only mounts the app.

The user asked for an A-letter favicon on the site.

The user asked Save on edit salary and edit details to stay disabled until Zod confirms a trimmed, valid value that differs from the current record. Spaces alone do not enable Save.

The user asked for a back arrow before the Employees label on the employee detail header.

The user asked the mobile sidebar sheet to close when Insight, Employees, or ACME is chosen.

The user asked for a filter icon on mobile so country, department, level, and status open in a sheet instead of filling the screen. Search stays visible beside the icon.

The user asked for employee cards on mobile because the wide table was not usable there. The directory keeps the table from 768px up and shows a card list below that.

The user asked the Insights currency cards to show the currency symbol before the total and average amounts.

The user asked the Insights page to show only two charts: a bar chart for headcount by department and a line chart for headcount by level, instead of six bar charts.

The user asked the Insights header to match the reference: Insights title and the 15 Nov 2026 rate line on the left, All countries, All departments, and Export CSV on the right. The View employees button stays off that page.

The user asked for charts on the pay insight. Recharts draws headcount by department and by level. Salary totals stay on the currency cards so amounts are never mixed on one axis.

The user asked for the directory count and page controls to sit in the table footer, under the rows.

The user asked the directory to show code, name, job title, department, country, local salary with its currency symbol, a USD amount, and an edit action instead of a status column. Row and edit-icon clicks open an employee page with the current salary, band, profile, and salary history. USD uses fixed fictional rates and is not added into the currency totals. Import CSV, export CSV, and add employee write through the same salary rules.

The user asked for a sidebar. Insight and Employees moved out of the header into the shadcn sidebar, with the trigger left in the content bar.

The user asked for a separate employees page, with the opening page kept as the pay insight. `/` shows country, department and currency cards. `/employees` shows the search, the same group filters and the table. The insight request omits the name query so a search does not move the group total. Both server adapters return the client shell for `/employees`.

The user asked for the currency summary and the employee directory to share the window properly. The summary was a 240px block and the table had 238px, so about three 60px rows were visible. The title moved into the header, the cards became a short strip, the employee ID sits beside the name, and paging sits on the directory heading so the table keeps the remaining height.

The user asked to use UI UX Pro Max. At upstream revision 281e453, the design-system search for “HR employee management dashboard” recommended flat design and a compact dashboard. We applied those recommendations, labeled the search scope and used native keyboard-accessible form controls. The showcase sections suggested by the same search did not serve the employee workflow. A local browser check on EMP-00001 raised the India Engineering total from INR 49,30,53,160.00 to INR 49,30,63,160.00 with 417 employees before and after refresh.

The request to fix the review findings led to SQLite-triggered salary history, persistent employee ID allocation, revision checks on profile writes, and digest-based CSV batch receipts. Automated checks force failed writes and retry batches against an isolated database. Local sign-in configuration was repaired privately.

For the request to deploy on Vercel with a custom subdomain, AI prepared a Vercel function entry point and Turso adapter. The user selected Turso. The adapter regression test applies all migrations twice, seeds twice, checks an exact INR raise and conflict response, replays an import batch and forces a transaction failure. Actual hosted deployment and DNS verification require the user's connected hosting and DNS accounts.
