# Trading-App

Production-ready trading journal frontend for Vercel.

## Deploying to Vercel

1. Import `https://github.com/damienbrace/Trading-App` into Vercel.
2. Leave the project root as the repository root.
3. Vercel will run:

```text
npm run build
```

4. Vercel will publish the generated `dist` folder.

The production build copies the static app from `outputs/trading-journal-app` into `dist`.

## Supabase

Use Supabase for authentication, private CSV storage, and cloud database sync.

Run `supabase/schema.sql` in the Supabase SQL editor after creating the project. The schema enables Row Level Security on app tables and scopes every row to `auth.uid()`.

Safe browser values go in Vercel environment variables:

```text
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
```

Never commit or expose:

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
database password
broker API keys
paid data API keys
```

Service role and secret keys belong only in trusted server-side code such as Supabase Edge Functions or Vercel serverless functions.

## Security Checklist

- Keep Supabase Row Level Security enabled on every exposed table.
- Store CSV uploads in the private `csv-imports` bucket.
- Store user-owned files under a path beginning with the user's auth id.
- Keep secrets out of frontend JavaScript.
- Use Vercel environment variables for public config.
- Use server-side functions for anything needing secret keys.
- Review `vercel.json` before loosening Content Security Policy.
