# PostgreSQL and Cloudinary setup

The server uses PostgreSQL through Prisma. Revision images and videos are uploaded to Cloudinary; the API serves them through an authenticated media endpoint so Cloudinary URLs are not exposed to students.

## Configure the server

1. Create a PostgreSQL database and copy `server/.env.example` to `server/.env`.
2. Set `DATABASE_URL` to the PostgreSQL connection string. If your provider supplies a separate direct connection string for schema management, set `DIRECT_URL` too; otherwise, use the same value for both. Fill in the Cloudinary cloud name, API key, and API secret.
3. From the `server` directory, run:

   ```sh
   npm install
   npm run db:generate
   npm run db:push
   ```

`db:push` creates or updates the PostgreSQL schema. Do not run the seed script on a database whose data you want to keep; it deletes existing records.

## Copy existing SQLite data

The SQLite database and local revision files are not deleted. Back them up before migrating. The importer requires an empty PostgreSQL database and copies all app records in foreign-key order. It also uploads revision media from `server/uploads/revision` to Cloudinary and saves the resulting URLs in PostgreSQL.

After configuring the PostgreSQL and Cloudinary values above, run this from `server`:

```sh
npm run db:migrate:sqlite
```

The importer reads `server/prisma/dev.db` by default. To use another SQLite file, set `SQLITE_DATABASE_URL` in `server/.env`; SQLite file paths are relative to the schema in `server/prisma`. The script checks the source files, refuses a non-empty PostgreSQL destination, and reports row counts after import. Keep the SQLite database and its upload directory as backups until you verify the migrated application.

Run the importer against the new empty database. If a migration fails, check the reported error and restore or recreate the PostgreSQL destination before retrying. Cloudinary credentials are needed when the SQLite database contains revision media files.
