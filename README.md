# MAAK | معك — Website

Bilingual (Arabic default / English), RTL/LTR, light/dark travel-services website.
React + Vite + TypeScript, plain CSS, `lucide-react` icons. Supabase-backed accounts are optional until backend credentials are configured; no tracking is used.

## Run
```bash
npm install
npm run dev        # development server
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```
Requires Node.js 18+.

## Configure
- **WhatsApp number & contact details:** `src/config/site.ts`. The number is a **placeholder** (`+000 000 000 0000`);
  replace it with the real one. Digits are extracted automatically for the `wa.me` link. Set `email` / `address`
  to show them in the Contact section (hidden while empty).
- **Copy / translations:** `src/i18n/translations.ts` (all user-facing text, including prefilled WhatsApp messages).
- **Colours:** CSS variables at the top of `src/styles/global.css`.
- **Logo:** `src/assets/logo.png` and `public/favicon.png` (the supplied logo; only surrounding whitespace trimmed).
  If you have a transparent PNG/SVG version, replace these files directly.

## Structure
`src/components` (UI + sections), `src/context` (language/theme state, persisted in localStorage),
`src/i18n`, `src/config`, `src/utils/whatsapp.ts`, `src/hooks`, `src/styles`.

## Accounts, requests, referrals and wallet

The website uses Supabase as the shared backend for the website and future mobile clients. It provides phone OTP authentication, a PostgreSQL database, row-level security, and a generated REST/RPC API. Service request forms continue to open WhatsApp, but first save the inquiry and its referral attribution when Supabase is configured. A missing configuration keeps the existing WhatsApp-only flow available.

### Configure the backend

1. Create a Supabase project and configure an SMS provider under Authentication → Providers → Phone. Keep phone confirmation enabled and use international E.164 phone numbers.
2. Apply `supabase/migrations/202610300001_accounts_referrals_wallet.sql` using the Supabase CLI (`supabase db push`) or the SQL editor.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings to the Vercel project and local `.env` (see `.env.example`). The anon key is designed for browser use; never put a service-role key in website code or environment variables prefixed with `VITE_`.
4. Create the first MAAK account, then grant that exact profile administrator status from the Supabase SQL editor using the trusted database owner account:

   ```sql
   insert into public.user_roles(user_id, role)
   select id, 'admin' from public.profiles where phone = '+967XXXXXXXXX'
   on conflict (user_id) do update set role = excluded.role;
   ```

   Replace the phone with the verified administrator phone. Do not expose this query or role table as a customer feature.
5. Redeploy the site. The `/account` page supports phone OTP, saved orders, referral links and wallet history. The `/admin` page is shown only to users with a server-side `user_roles` entry.

### Data and payment rules

- `profiles`, `orders`, `referrals`, `wallet_transactions`, `app_settings` and `audit_log` are the shared source of truth.
- `create_order` is the guest/account request API. It accepts a client idempotency UUID and validates the phone, input lengths and referral code before writing. A referral is fixed to the first qualifying source for that phone.
- `apply_wallet_to_order` locks the profile and order, verifies the available ledger balance and quote, and writes the debit and order update in one transaction. Clients cannot insert or edit ledger rows.
- Referral credit is issued once, by a database trigger, only when an order has both `payment_status = 'paid'` and `status = 'completed'`. A unique ledger idempotency key prevents duplicate rewards.
- Admin updates use `admin_update_order`, `admin_set_commission` and `admin_adjust_wallet`; these record audit entries. Payment and service status are separate fields. Manual payment confirmation is supported; no payment gateway is configured.
- Database policies prevent customers from reading other customer records, changing order/payment state, granting roles, or changing wallet balance. Never ship a service-role secret to a browser or mobile app.

### API for future clients

The website and a future MAAK app should use the same Supabase project and authenticated access token. Supabase Auth handles OTP; the REST API is available under `/rest/v1`, and atomic operations are exposed under `/rest/v1/rpc/`:

- `POST /rest/v1/rpc/create_order` for guest or authenticated inquiries.
- `POST /rest/v1/rpc/apply_wallet_to_order` for spending wallet balance.
- `POST /rest/v1/rpc/admin_update_order`, `admin_set_commission` and `admin_adjust_wallet` for administrator-only operations.
- Authenticated `GET` access to own `profiles`, `orders`, `referrals` and `wallet_transactions` is filtered by RLS.

Send the Supabase `apikey` header and the user's `Authorization: Bearer <access_token>` header from clients. Keep the anon key public, rely on RLS for client access, and introduce versioned Edge Functions if a future API operation needs provider secrets or external payment webhooks.

### Current integration limits

This repository does not contain a backend, a payment gateway, or SMS credentials. The SQL migration and UI are ready to deploy, but customer accounts, persisted requests, SMS verification and administration remain inactive until a MAAK Supabase project, SMS provider and administrator profile are configured. Wallet commission is initially zero and can be set from the admin panel. Real online payments and provider webhooks require selecting and configuring a payment provider.
