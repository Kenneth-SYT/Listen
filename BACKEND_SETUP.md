# Supabase connection

The frontend uses Supabase Auth, the database Data API with Row Level Security, and a `create-checkout` Edge Function. Backend files live in the separate sibling folder `../Listen Mental Health Backend`, not in this Git repository.

The current `.env.local` contains the project URL and public publishable key supplied for `zxpivossmzzlgvphqwic`. It is ignored by Git. Use `.env.example` when setting up another machine. No Stripe secret or Supabase privileged key belongs in a `VITE_` variable.

## Run

```powershell
npm ci
npm run dev
```

Restart the dev server after changing environment variables. On your frontend host, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, rebuild, and enable an SPA fallback to `index.html`.

For temporary testing without confirmation emails, set `VITE_REQUIRE_EMAIL_VERIFICATION=false`, leave the Edge Function variable `REQUIRE_EMAIL_VERIFICATION` unset or set it to `false`, and disable **Confirm email** in Supabase Authentication settings. To restore verification, enable the Supabase setting and set both variables to `true`.

## Pages

- `/login`: sign in, create an account, email confirmation and password reset.
- `/get-matched`: five-question intake, public listener/time selection, a 15-minute server-side slot hold, account verification, booking review and secure checkout. Refreshing or leaving the booking flow clears its unfinished answers and signs out the account on this tab, so the next visitor starts privately. A confirmed email remains confirmed; returning members sign in again rather than receiving another confirmation email.
- `/listener`: assigned listeners can review their upcoming confirmed appointments, topics, notes, short K6 results, and long K10 questionnaire context.
- `/account`: appointment history and pending checkout recovery.
- `/booking-confirmation?booking_id=...`: reads the authenticated customer's database status; never trusts browser storage as proof of payment.
- `/admin`: manage listeners, dates and customer/default rates. Requires an administrator entry provisioned through Supabase SQL; customers cannot grant this role to themselves.

## Administrator access

Apply backend migration `202609220001_admin_directory.sql`, then create the intended administrator's account normally so it appears under Supabase **Authentication → Users**. In the Supabase SQL editor, grant that existing account access with:

```sql
insert into public.admin_users(user_id)
select id from auth.users where lower(email) = lower('admin@example.com')
on conflict do nothing;
```

The administrator signs in through `/login` and then opens `/admin`. To revoke access, run:

```sql
delete from public.admin_users
where user_id = (select id from auth.users where lower(email) = lower('admin@example.com'));
```

Do not put administrator emails or Supabase service-role keys in frontend environment variables. The page checks `public.is_admin()`, all customer tables remain protected by row-level security, and the account directory is exposed only through an admin-guarded database function.

Apply the migrations and deploy the Edge Functions using the backend README. Configure Stripe secrets/webhooks and Supabase Auth redirect URLs before attempting payment. The temporary Aiden listener has four one-hour test slots per Sydney date for 90 days from 18 September 2026. Aiden's slots are deliberately reusable after a confirmed test payment, but a current hold or pending checkout still blocks another visitor. Disable this test behavior before real bookings. Future real availability can be managed through `/admin`. An administrator can link a listener's verified account to their profile there.

## Validation

```powershell
npm run build
npm run lint
```

The backend repository has separate database security/pricing tests and Deno type checks. Full sign-up/payment testing requires a deployed backend and Stripe test configuration.
