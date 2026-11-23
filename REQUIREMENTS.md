# ACME Compensation — Requirements

**Persona & goal.** An ACME HR manager replaces spreadsheet lookups with one reliable workflow: find an employee, update their annual base salary, and understand the effect on their country or department's compensation figures. This assessment uses fictional data only.

## Scope and workflow

Search 10,000 employees by case-insensitive name or stable employee ID; combine country and department filters; browse server-paginated results. Select an employee, review their recorded currency and annual base salary, enter a new amount, and save with clear validation and success feedback. Show headcount, total annual base salary and average annual base salary for the same filtered population, grouped by currency. Refresh these figures after saving.

## Acceptance criteria

1. HR can find an employee by name or ID among 10,000 records and narrow the list by country and department.
2. HR can update an employee’s annual base salary in their recorded currency. Invalid amounts produce an error, and a successful edit survives a refresh.
3. HR can see headcount, average salary, and total salary for a filtered group. Different currencies appear separately, and a saved edit updates the figures.

## Data and money decisions

Each employee has a stable ID, fictional name, department, country, ISO currency, annual base salary in integer minor units and a revision for conflicting edits. Seed exactly 10,000 deterministic records across India/INR, US/USD, UK/GBP and Germany/EUR. Seed reruns insert missing fixture records without overwriting salary edits. All currencies have two decimal places. Accept plain decimal strings from 0.01 through 100,000,000.00; reject negatives, exponent notation and extra precision. No exchange rates or mixed-currency totals: there is no defensible conversion date/source in this task. All salaries cover the same annual base period; averages round to the nearest minor unit.

## Architecture and delivery

TypeScript, React and an Express API served from one application. Prefer persistent SQLite; use hosted PostgreSQL if durable SQLite is unavailable. SQL filtering, aggregation and bounded pagination keep 10,000 rows off the client. Server validation, parameterized SQL and optimistic concurrency protect updates. Deliver schema, repeatable seed, fast deterministic unit/integration tests, production build, live deployment, a 3–4 minute demonstration, incremental Git history, README and actual AI decision notes. Before submission, verify deployed persistence, filtered INR total changing by exactly ₹10,000, and repository/video access. Reply to the original Incubyte email with the three links.

## Deliberate exclusions

Payroll processing, tax calculations and bank payments are excluded because this product manages compensation records and reporting, not payroll execution. Exclude bonuses, benefits, historical effective dates, FX conversion, employee CRUD, imports, charts and bulk edits to preserve one complete workflow within six focused hours plus a one-hour buffer. The public demo contains fictional data and permits demo salary edits; production HR identity, authorization, audit retention and compliance are a separate hardening milestone before any real employee data is used.

**Timebox:** started 23 November 2026, 11:39 IST; deployment target 15:39, submission target 17:39, buffer ends 18:39. Requirements authored before application code.
