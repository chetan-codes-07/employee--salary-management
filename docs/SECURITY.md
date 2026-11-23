# Demo access and data protection
The assessment dataset consists entirely of generated employee identities and salaries. Keep real HR records out of the repository, recording and hosted database.

## Access boundaries
The Site audience currently controls who can reach the deployment. Inside the app, any admitted demo visitor can search, read summaries and edit a fictional salary. There are no employee accounts or department-level permissions. With public access, anyone holding the URL could change demo salaries. Confirm actual reviewer access before submission.

The seed route requires a server-configured SEED_TOKEN bearer value. With the token unset the route rejects every request. Keep hosting and seed credentials in runtime configuration. Keep credentials and database files out of Git, logs, URLs and client bundles.

## Request handling
Validate the amount and revision on the server. Bind query values and escape literal search wildcards. Bound search length, page size and JSON body size. Perform the revision check in the write itself. Return an actionable validation or conflict message and a generic message for unexpected failures.

## Release review
Verify unauthenticated seed requests fail, malformed input leaves the salary unchanged, and stale writes cannot overwrite a newer salary. Inspect staged files for credentials, review dependencies and verify the demo audience. The demo has no application-level rate limiter or salary audit trail. Real HR deployment would require authenticated HR roles, scoped access, an audit history, abuse controls and a recovery policy before importing employee data.
