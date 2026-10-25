# Application data storage

The API uses PostgreSQL when `DATABASE_URL` is set. It stores the existing
application model data in a single JSONB row and serializes writes with a
database transaction, so deployed function instances use shared state.

For local development without `DATABASE_URL`, the API uses a JSON file. Set
`JSON_STORE_PATH` to select a path; by default it uses
`server/data/reelearn.json`.

On Vercel, `DATABASE_URL` is required for data endpoints. The health endpoint
reports the active storage using `/api/health`. Never rely on Vercel `/tmp` for
application records.

This JSONB-backed adapter preserves the current app's data interface, but it
loads and writes the whole dataset for each operation. It is appropriate as a
small deployment fix, not a high-volume database design. Migrate to normalized
PostgreSQL tables before the dataset or request volume grows substantially.

Vercel's previous `/tmp` data is not durable and cannot be migrated
automatically. Create accounts again or import data from a backup. Run
`npm run seed --prefix server` to reset local JSON storage and load sample data.
Run `npm run principal:create --prefix server` for a local principal; deployed
principal credentials are configured as backend environment variables. See
[PRINCIPAL_SETUP.md](./PRINCIPAL_SETUP.md).
