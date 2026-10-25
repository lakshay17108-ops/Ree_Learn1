# Principal account setup

Principal credentials are secrets: do not commit them to source control or send
them in chat.

## Vercel deployment

In the Vercel project, open **Settings → Environment
Variables** and add these variables for the environments where the API is
deployed:

- `JWT_SECRET`: a long, random signing secret.
- `PRINCIPAL_EMAIL`: the principal's email address.
- `PRINCIPAL_PASSWORD`: a new, unique password with at least 12 characters.
- `PRINCIPAL_NAME`: optional display name.
- `DATABASE_URL`: the PostgreSQL connection URL from your database provider.
  Prefer its pooled/serverless connection string if available.

Redeploy the API after adding or changing these variables. On the first
successful principal sign-in, the API creates the configured account if it
doesn't already exist. The principal then signs in at `/principal-login`.

If the configured email already belongs to a non-principal account, change the
environment variable to a different email. Existing principal accounts are not
silently overwritten when the environment password changes.

## Local development

Copy `.env.example` to `.env` in the `server` directory, then replace the
principal placeholders and `JWT_SECRET` with local values. `.env` is ignored by
Git and must not be committed.

## Storage warning

The API uses PostgreSQL for shared app data when `DATABASE_URL` is set. The
previous Vercel `/tmp` JSON data is not durable and cannot be migrated
automatically. Users and other records from that store may need to be recreated.
