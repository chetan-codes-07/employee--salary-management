# Demo access and data protection
The assessment dataset consists entirely of generated employee identities and salaries. Keep real HR records out of the repository, recording and hosted database.

## Access boundaries
Each dashboard visitor signs in with the configured HR email and password. Every employee, reporting, CSV and options endpoint checks a server-side session. Login issues a random token in an HttpOnly, SameSite=Strict cookie with an eight-hour lifetime. Hosted and production cookies require HTTPS. SQLite stores only token digests and expiration times. Logout deletes the session. The login endpoint limits each client to ten attempts per fifteen-minute window. The Site audience is an additional outer gate. This assessment uses one shared HR role.

The seed route requires a server-configured SEED_TOKEN bearer value. With the token unset the route rejects every request. Keep hosting and seed credentials in runtime configuration. Keep credentials and database files out of Git, logs, URLs and client bundles.

## Request handling
Validate the amount and revision on the server. Bind literal substring searches using SQLite instr and lower. Bound search length, page size, JSON body size and CSV import size (up to 10,000 rows / 8 MB). Match the revision in both salary and profile writes. Startup requires a valid HR email and a nonempty password for local development. Hosted and production sign-in require a password of at least 16 characters. Return an actionable validation or conflict message and a generic message for unexpected failures.

## Release review
Verify unauthenticated seed requests fail, malformed input leaves the salary unchanged, and stale writes cannot overwrite a newer salary. Inspect staged files for credentials, review dependencies and verify the demo audience. Login throttling applies to the sign-in endpoint. Real HR deployment would require authenticated HR roles, scoped access, an audit history, abuse controls and a recovery policy before importing employee data.
