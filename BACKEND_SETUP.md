# Supabase connection

The frontend uses Supabase Auth, the database Data API with Row Level Security, and a `create-checkout` Edge Function. Backend files live in the separate sibling folder `../Listen Mental Health Backend`, not in this Git repository.

The current `.env.local` contains the project URL and public publishable key supplied for `zxpivossmzzlgvphqwic`. It is ignored by Git. Use `.env.example` when setting up another machine. No Stripe secret or Supabase privileged key belongs in a `VITE_` variable.

## Run

```powershell
npm ci
npm run dev
```

Restart the dev server after changing environment variables. On your frontend host, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, rebuild, and enable an SPA fallback to `index.html`.

## Pages

- `/login`: sign in, create an account, email confirmation and password reset.
- `/get-matched`: questionnaire, contact details, account verification, live availability and secure checkout.
- `/account`: appointment history and pending checkout recovery.
- `/booking-confirmation?booking_id=...`: reads the authenticated customer's database status; never trusts browser storage as proof of payment.
- `/admin`: manage listeners, dates and customer/default rates. Requires an administrator entry provisioned through Supabase SQL; customers cannot grant this role to themselves.

Apply the migration and deploy the Edge Functions using the backend README. Configure Stripe secrets/webhooks and Supabase Auth redirect URLs before attempting payment. Add real listeners and future availability through `/admin`; there are no generated fake time slots.

## Validation

```powershell
npm run build
npm run lint
```

The backend repository has separate database security/pricing tests and Deno type checks. Full sign-up/payment testing requires a deployed backend and Stripe test configuration.
