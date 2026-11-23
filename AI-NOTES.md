# AI collaboration record

This application was built with Codex. The user supplied the assessment and explicitly narrowed the product to “find an employee, update their salary, and see how that change affects pay figures for their country or department.” They required a six-hour budget, early deployment, 10,000 deterministic fictional employees, minor-unit money, currency-separated reporting and genuine incremental commits.

## Actual prompts and decisions

1. User: “The first step is the requirements document—then build and commit in small, reviewable stages.” Accepted: requirements were written before any application code and committed as `Define HR workflow, scope, and acceptance criteria`.
2. User: “Serve the React build and API from one service to simplify deployment. SQLite is suitable if the host provides persistent storage.” Chose durable D1 SQLite via Sites rather than unverified filesystem SQLite or introducing PostgreSQL infrastructure. Checked the official Cloudflare Express/D1 tutorial before selecting the Node HTTP adapter. Local Node and hosted Worker share Express routes and SQL behavior.
3. User: “increase one INR salary by ₹10,000, refresh, and show that the filtered INR total rose by exactly ₹10,000.” This is the central demo and verification scenario. No cross-currency total or exchange-rate assumption is introduced.

## Review policy

AI-generated code must pass TypeScript checks, deterministic tests and a production build. Money tests use explicit expected integer values; reporting tests will use hand-calculated fixtures rather than derive expected results from implementation. Deployment and submission evidence is recorded only after each action succeeds. AI assistance is disclosed rather than presented as unaided authorship.
