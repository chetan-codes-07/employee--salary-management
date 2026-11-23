# Code conventions
Use strict TypeScript. Treat incoming request data as unknown until checked. Keep handlers focused on HTTP input and output. Keep money conversion and reporting rules in server modules shared by both runtime adapters.

- Include units in monetary identifiers such as salary_minor and totalMinor. Use a decimal string for a submitted salary. Convert it once at the API boundary.
- Keep SQL names in snake_case. Use descriptive verbs for operations such as updateSalary. Name tests after observable behavior.
- Reuse the filter builder for list and summary predicates. Pass paging parameters only to the list query. Keep the product decision about search scope visible in the PRD.
- Surface expected errors through InputError. Keep a conflict distinguishable from missing employees and malformed amounts.
- Prefer readable functions and named intermediate values when validation or arithmetic becomes hard to scan. Split UI components around the directory, summary and editor when they develop separate responsibilities.
- Commit each reviewable behavior with its tests. Record a changed decision in the same commit and describe the user-visible effect in the commit message.

Run `npm run check` for the configured static check. There is currently no lint script.
