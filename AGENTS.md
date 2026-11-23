# ACME Compensation
An HR manager finds a fictional employee, updates their annual salary and checks how the edit affects group compensation. The [original requirements](REQUIREMENTS.md) were committed before implementation.

## Project map
| When working on | Read |
| --- | --- |
| Product scope and acceptance criteria | [PRD](docs/PRD.md) |
| UI, editor and accessibility | [Design system](docs/DESIGN_SYSTEM.md) |
| Routes, runtime or deployment | [Architecture](docs/ARCHITECTURE.md) |
| Schema, queries, migrations or seed | [Database](docs/DATABASE.md) |
| Access, secrets or request handling | [Security](docs/SECURITY.md) |
| TypeScript and code organization | [Code style](docs/CODE_STYLE.md) |
| Verification and release evidence | [Testing](docs/TESTING.md) |

## Commands from the repository root
1. Install the lockfile with `npm ci`.
2. Create or update the fictional dataset with `npm run seed`.
3. Run `npm test` and `npm run check`.
4. Build with `npm run build`. Launch with `npm run dev` and visit http://localhost:3000. Rebuild to serve changed client assets.
5. After changing the schema, generate a migration with `npm run db:generate` and review its SQL.

## Working agreements
Store money as integer minor units. Keep annual base salary groups separate by currency. Use conditional salary updates with the employee's revision. Preserve existing salary edits on seed reruns. Keep all demo records fictional and all secrets server-side.

Check the relevant document before changing behavior. Commit a small working stage with its tests. Record decisions in [the decision log](docs/DECISIONS.md) and substantive AI contributions in [AI notes](AI-NOTES.md). Distinguish checks actually performed from checks still planned.
