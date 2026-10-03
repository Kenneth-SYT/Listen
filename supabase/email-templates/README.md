# Supabase authentication email templates

## Confirm signup

In Supabase, open **Authentication → Emails → Templates → Confirm signup**.

- Subject: `Your Listen Mental Health verification code`
- Body: paste the contents of `confirm-signup.html`

The template uses the verified first-party logo at `https://listenmentalhealth.com/LMH_sideways.png`, with `Listen Mental Health` as fallback text when an email client blocks remote images. The `{{ .Token }}` variable must remain unchanged because the booking page verifies that code with Supabase. The continue button uses the opaque signup-draft token stored in `{{ .Data.signup_draft_token }}` and the per-request `{{ .RedirectTo }}` URL, so it works for both the approved live URL and approved local-development redirects.

Apply backend migration `202610010001_signup_drafts.sql` before publishing this template. Saved drafts expire after 15 minutes and never contain a password, verification code, payment information or booking hold.

After saving, create a new test account rather than resending an old preview. Confirm that Brevo records a **Delivered** event and inspect the received message in Gmail and Outlook.

## Brevo settings

For account-verification emails, avoid engagement tracking where possible. In Brevo, review **Settings → Automations → Transactional emails → Tracking**. Enable anonymous tracking, or disable individual open/click tracking if that option is available for the account. Authentication emails do not need marketing analytics, and tracking pixels can create false opening events.

Keep the sender consistent:

- From name: `Listen Mental Health`
- From address: `no-reply@listenmentalhealth.com`
- Authenticated domain: `listenmentalhealth.com`
- Branded subdomain: `mail.listenmentalhealth.com`

Do not embed the logo as a base64 image or attachment. Keep it as a small HTTPS asset on `listenmentalhealth.com`, retain meaningful alt text, and confirm the public URL continues to return the image after deployments.
