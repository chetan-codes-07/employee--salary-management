# Verification
Use the Node test runner with tsx. Run `npm test` for tests in tests/*.test.ts, `npm run check` for TypeScript and `npm run build` for the client and Worker. Treat each command as a separate check. No CI pipeline is configured at this documentation checkpoint.

## Test cases
- **Money.** Verify exact conversion of 0.29 to 29 minor units, the allowed endpoints, and rejection of extra precision, exponents, negative values and numeric JSON inputs.
- **Directory.** Check name and ID search, literal wildcard characters, combined filters, stable order across page boundaries and an empty result.
- **Persistence.** Edit a row, close the database, reopen it and read the edited salary. Submit a stale revision and confirm the first edit survives.
- **Seed.** Use an isolated SQLite database. Run the fixed seed twice and confirm 10,000 unique IDs and preservation of a prior edit.
- **Reporting.** Use two India Engineering salaries of INR 100,000 and INR 200,000, one US Engineering salary of USD 50,000, and an India Sales salary of INR 300,000. India Engineering must show 2 people, INR 300,000 total and INR 150,000 average. Raise the first salary by INR 10,000. Expect INR 310,000 total and INR 155,000 average. The USD group must stay at USD 50,000. Include a case that rounds at half a minor unit.

## Release evidence
From a clean checkout, install with npm ci, seed, test, build and launch. From a fresh reviewer browser, open the deployed app, filter to India Engineering and record the initial INR total. Find the employee, save the raise, refresh, and compare the same group's total. Verify persistence across a service restart or release. Record the actual before/after figures, revision and verification outcome. Check access to the repository, app and video before replying to the assessment email.

These cases describe the release target. A passing unit suite alone does not verify remote persistence or reviewer access.

Regression tests force an audit-history insertion failure, replay all 100 batches of a 10,000-row CSV, retry an interrupted batch, and check profile conflicts and ID allocation after deletion. The HTTP integration tests bind a temporary loopback port.

The built Worker was also exercised against Cloudflare's local D1 emulator. Applying the SQL migrations, logging in, uploading 10,000 employees through the HTTP API, replaying the first and last batch, and raising one INR salary by ₹10,000 all succeeded. The filtered total increased by exactly ₹10,000. This run used a disposable database.
