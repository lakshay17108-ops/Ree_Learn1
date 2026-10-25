# Deploy the app on Vercel

This repository is configured as one Vercel project. Vercel serves the React app and runs the Express API as a Function. PostgreSQL and Cloudinary are separate managed services and must be configured before using the deployed app.

## Configure Vercel

1. Create a PostgreSQL database and a Cloudinary account.
2. Import the GitHub repository into Vercel. Set the project root to the repository root, not `client` or `server`. Use the **Other** framework preset if Vercel asks for one.
3. Add these environment variables to Vercel for Production and any Preview environments you use:
   - `DATABASE_URL` — PostgreSQL connection string, preferably the provider's pooled/serverless URL.
   - `JWT_SECRET` — a long, random signing secret.
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `PRINCIPAL_EMAIL` and `PRINCIPAL_PASSWORD` — optional initial principal account; the password must be unique and at least 12 characters.
   - `PRINCIPAL_NAME` — optional display name.
   - `CLIENT_URL` — optional; same-origin requests are allowed automatically. Set exact origin(s), comma-separated, only when using a separate domain or preview URL.
4. Deploy. Root `vercel.json` installs both workspaces, builds the server and client, publishes `client/dist`, and routes API requests to `api/[...path].js`. The API requires `DATABASE_URL`; its first health/API request initializes the PostgreSQL JSONB store.
5. Visit `https://<your-deployment>/api/health` and confirm the response reports `"storage":"postgresql"`.
6. Sign in once using the configured principal email and password. The principal account is created on the first successful sign-in. After that, remove `PRINCIPAL_PASSWORD` from Vercel if you no longer need the auto-provisioning fallback.

Do not set `VITE_API_URL` to another host for this deployment. The client defaults to the same-origin `/api` path. Never add server secrets to `VITE_*` variables or commit them to the repository.

## Database and existing data

The current server uses a PostgreSQL-backed JSONB store rather than Prisma's normalized tables. It automatically creates its store table on first use; no Prisma generate, migration, or schema-push step is needed. Read [server/JSON_STORE.md](./server/JSON_STORE.md) for storage behavior and scaling limitations.

The old SQLite file is not imported automatically. Keep `server/prisma/dev.db` and any local media as backups. The previous SQLite-to-Prisma importer is not compatible with the current JSONB store; existing records need a deliberate export/import before going live.

## Revision uploads

Images and videos are signed by the API and uploaded directly from the browser to Cloudinary. Media file bodies do not pass through Vercel Functions. Cloudinary assets are public by default, so anyone who obtains an asset URL may be able to view it; do not treat the URL as private authorization. Test image/video uploads and playback after deployment.

Vercel Functions are not a continuously running server, and provider limits or free-tier policies can change. Confirm current Vercel, PostgreSQL, and Cloudinary limits before relying on this deployment for real users.
