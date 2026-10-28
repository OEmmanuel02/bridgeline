# Bridgeline

Bridgeline is a web platform for remote-work training and responsible talent matching between candidates in Nigeria and international employers. It consists of a Vite/React frontend and a separately hosted Express API backed by PostgreSQL and Prisma.

The application is suitable for controlled staging and further launch preparation. It is **not deployed**. Public account registration and submissions are disabled by default; keep them disabled until the launch blockers below are resolved.

## Architecture

- `src/`: React 19, React Router, TypeScript, and Tailwind CSS. `App.tsx` owns routing/metadata; page modules, shared site chrome/forms, API/session utilities, and separate candidate/employer/admin dashboard views live in focused modules.
- `apps/api/src/`: Express 5 API, access and refresh-token authentication, input validation, rate limiting, and protected candidate/employer/admin routes.
- `apps/api/prisma/`: PostgreSQL data model and ordered SQL migrations.
- `public/`: brand icon and favicon assets served by Vite.
- Root npm workspaces manage the frontend and API together. The API can be deployed as a long-running Node service; it is not implemented as a Vercel serverless function.

## Requirements

- Node.js 22.12 or newer (the root package declares this requirement)
- npm 10 or newer
- PostgreSQL 14 or newer for a persistent local or hosted environment

## Local setup

In PowerShell:

1. Install the workspace dependencies:

   ```powershell
   npm.cmd ci
   ```

2. Create a PostgreSQL database and user. Copy `.env.example` to `.env`, then set `DATABASE_URL` and a randomly generated `JWT_SECRET` of at least 32 characters. The example secret is deliberately invalid.

   ```powershell
   Copy-Item .env.example .env
   ```

   Example local database URL:

   ```text
   postgresql://bridgeline:your-local-password@localhost:5432/bridgeline?schema=public
   ```

3. Generate the Prisma client and apply the committed migrations:

   ```powershell
   npm.cmd run db:generate
   npm.cmd run db:migrate
   ```

4. Start the API and frontend in separate terminals:

   ```powershell
   npm.cmd run dev:api
   ```

   ```powershell
   npm.cmd run dev
   ```

   Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` to `http://localhost:4000`. The API health check is at `/health`; `/ready` checks database readiness.

`npm.cmd run db:migrate` applies committed migrations and is appropriate for initializing a database from scratch. Use `npm.cmd run db:migrate:dev` when intentionally changing the Prisma schema during local development; review and commit the generated migration. Do not edit a production database schema by hand.

The root `.env` is ignored. Never place `DATABASE_URL`, `JWT_SECRET`, or administrator bootstrap credentials in a `VITE_` variable. The `VITE_` settings are compiled into the public frontend and are not secrets.

## Environment variables

| Variable | Service | Required / default | Purpose |
|---|---|---|---|
| `NODE_ENV` | API | `development` | Use `production` for a hosted API. |
| `PORT` | API | `4000` | HTTP listener port; use the port assigned by the hosting platform. |
| `DATABASE_URL` | API and migration job | Required | PostgreSQL connection string. Use the provider's TLS-enabled connection string. |
| `JWT_SECRET` | API | Required | Random server-only signing secret, at least 32 characters. Do not use the example placeholder. |
| `APP_ORIGINS` | API | Local Vite origins | Comma-separated, exact browser origins, with scheme and no path or trailing slash. Production requires HTTPS origins. |
| `TRUST_PROXY_HOPS` | API | `0` locally | Exact number of trusted platform proxies in front of the API. Production refuses `0`; configure the actual platform hop count, commonly `1`. |
| `ACCESS_TOKEN_TTL_SECONDS` | API | `600` | Access-token lifetime; permitted range is 60–900 seconds. |
| `REFRESH_TOKEN_TTL_DAYS` | API | `14` | Refresh-session lifetime; permitted range is 1–30 days. |
| `PUBLIC_SUBMISSIONS_ENABLED` | API | `false` | Enables public application, hiring-request, and contact submissions. Requires a reviewed, non-draft privacy notice version. |
| `PUBLIC_REGISTRATION_ENABLED` | API | `false` | Enables public candidate and employer account registration. Requires a reviewed, non-draft privacy notice version. |
| `PRIVACY_NOTICE_VERSION` | API | `draft-1` | Version recorded with collected information. Replace the draft value only after the notice and operating procedures have been reviewed. |
| `ADMIN_BOOTSTRAP_EMAIL` | One-time admin command | Unset | Email for creating the initial administrator. Set only for the provisioning command. |
| `ADMIN_BOOTSTRAP_PASSWORD` | One-time admin command | Unset | Strong, unique password for the initial administrator. Set only for provisioning and remove immediately afterward. |
| `VITE_API_BASE_URL` | Frontend build | `/api/v1` | API base URL including `/api/v1`. Production should use the HTTPS API URL, for example `https://api.example.com/api/v1`. |
| `VITE_SITE_URL` | Frontend build | Unset | Canonical public site origin, for example `https://app.example.com`. When set, public routes get canonical URLs. |
| `VITE_PUBLIC_SUBMISSIONS_ENABLED` | Frontend build | `false` | Frontend visibility flag; keep aligned with the API setting. The API remains authoritative. |
| `VITE_PUBLIC_REGISTRATION_ENABLED` | Frontend build | `false` | Frontend visibility flag; keep aligned with the API setting. The API remains authoritative. |

`APP_ORIGINS` is the website origin making browser requests, not the API URL. For example, with a web app at `https://app.example.com` and API at `https://api.example.com`, configure `APP_ORIGINS=https://app.example.com` and `VITE_API_BASE_URL=https://api.example.com/api/v1`.

The API validates critical environment values at startup. Production additionally requires HTTPS origins and an explicit positive proxy-hop count. The refresh cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` in production. Use custom frontend and API hostnames under the same registrable domain (for example `app.example.com` and `api.example.com`); unrelated default hosting domains are cross-site and will not reliably support the strict refresh cookie.

## Database initialization, migrations, and backups

Committed migrations run in order:

1. `apps/api/prisma/migrations/20261027000000_init`
2. `apps/api/prisma/migrations/20261028000000_phase4_workflows`
3. `apps/api/prisma/migrations/20261029000000_add_weekly_pay_periods`

Hiring requests now offer hourly, weekly, bi-weekly, or monthly compensation. The `ANNUAL` database enum value remains only to preserve compatibility with any existing records; new requests cannot select it.

For a new database, first run `npm.cmd run db:generate`, then `npm.cmd run db:migrate`. In production, build/generate the client as part of the API build and run `npm run db:migrate` as a **single release/one-off task** against the production `DATABASE_URL` before routing traffic to the new API version. Do not run migration deploy independently in every application replica. Back up the database before a production migration and review the SQL; use backward-compatible expand/migrate/contract changes when old and new application versions may overlap.

Migration SQL was applied in order to an ephemeral PostgreSQL-compatible PGlite engine as a smoke test. This verifies that both committed SQL scripts execute and create the expected tables, but it does not replace applying and verifying them against the exact managed PostgreSQL provider and version used in production.

For operations, enable managed PostgreSQL automated backups/point-in-time recovery where available, restrict database network access to the API and migration runner, and retain encrypted off-provider backups according to an approved retention policy. Periodically restore a backup into an isolated database and verify application access before treating the backup process as proven. Set recovery-point and recovery-time objectives before launch; they have not been selected for this project.

## Administrator provisioning

Admin role assignment is not available through public registration. After migrations have been applied, set bootstrap credentials only in the environment for this one-time command:

```powershell
$env:ADMIN_BOOTSTRAP_EMAIL = "admin@example.com"
$env:ADMIN_BOOTSTRAP_PASSWORD = "use-a-unique-long-random-password"
npm.cmd run db:seed:admin
Remove-Item Env:ADMIN_BOOTSTRAP_EMAIL
Remove-Item Env:ADMIN_BOOTSTRAP_PASSWORD
```

The command refuses to overwrite an existing account or change its role. Never place these credentials in source control or persist them in the hosting service after provisioning.

## Development and verification commands

```powershell
npm.cmd run dev             # Vite frontend
npm.cmd run dev:api         # Express API
npm.cmd run lint            # Oxlint
npm.cmd test                # Full Vitest suite
npm.cmd run test:api        # API tests
npm.cmd run db:generate     # Generate Prisma client
npm.cmd run db:migrate      # Apply committed migrations
npm.cmd run build           # Build frontend and API
npm.cmd run preview         # Preview production frontend build
npm.cmd audit --audit-level=high
```

Public registration and form submissions remain disabled in tests and by default in local configuration. Browser checks from before the frontend modularization used mocked API responses: candidate, employer, and administrator account views rendered at a 320px viewport without horizontal overflow; public candidate controls were labeled; account/auth/draft-privacy pages were noindexed; and the first keyboard Tab on the candidate page reached the skip link and its main-content target. The integrated browser could not be connected for a post-refactor smoke test in this session. Recheck routes and responsiveness in a working browser before release. No live API/database workflows, automated axe rules, screen-reader behavior, or deployed hosting have been verified.

## Deployment recommendation

Recommended separation for the current architecture:

- **Frontend:** Vercel static hosting for the Vite `dist` output.
- **API:** Render Web Service running the compiled Express server as a long-lived Node process. Railway is a viable alternative for the same process model; neither should be configured as a serverless conversion of this API without additional engineering.
- **Database:** Render managed PostgreSQL in the same region as the API for a simple private-network setup. Railway PostgreSQL or another managed PostgreSQL provider can also work; choose a provider with TLS, automated backups/PITR, private connectivity, and a tested restore procedure.

Use custom domains under the same registrable domain for frontend and API so the `SameSite=Strict` refresh cookie works. Example names below are placeholders; the actual domain, DNS, providers, regions, plans, connection details, and secrets must be chosen by the operator.

### Frontend (Vercel)

1. Import the repository and select the Vite framework, or configure the project manually. The included `vercel.json` rewrites client-side routes to the SPA entry point and adds `nosniff`, frame denial, a strict referrer policy, a restrictive permissions policy, and HSTS headers for HTTPS responses.
2. Set the root directory to the repository root, build command to `npm run build:web`, and output directory to `dist`.
3. Add build-time variables `VITE_API_BASE_URL=https://api.example.com/api/v1`, `VITE_SITE_URL=https://app.example.com`, and the two `VITE_PUBLIC_*_ENABLED=false` flags.
4. Attach the custom `app.example.com` domain and verify HTTPS and direct navigation to `/account` and other client routes.

Do not run the root `npm run build` as the frontend build command: that also builds the API. The Vercel frontend should be a static Vite build, not a serverless API deployment.

### API (Render Web Service)

1. Create a Node Web Service from the repository root, use the same region as PostgreSQL, and attach `api.example.com` with HTTPS.
2. Use Node 22.12 or newer. Example build command:

   ```sh
   npm ci && DATABASE_URL=postgresql://build:build@localhost:5432/bridgeline npm run db:generate && npm run build:api
   ```

   The build-only placeholder URL is not used to connect to a database. Keep the actual `DATABASE_URL` only in the runtime environment and the protected migration task.
3. Set the start command to:

   ```sh
   npm run start --workspace @bridgeline/api
   ```

4. Set runtime `NODE_ENV=production`, `PORT` to the platform's assigned value, `TRUST_PROXY_HOPS` to the verified number of platform proxies, `APP_ORIGINS=https://app.example.com`, a randomly generated `JWT_SECRET`, actual `DATABASE_URL`, and appropriate token lifetimes. Keep both public feature flags `false` until launch gates are satisfied.
5. Configure the platform health check to call `/ready`. `/health` is a liveness check only; `/ready` verifies that the API can query PostgreSQL and returns a safe 503 when it cannot.
6. Run `npm run db:migrate` once as a protected release/one-off command using the actual production database URL before deploying code that requires the new schema. If the selected plan has no release command, run the migration manually as an approved deployment step before shifting traffic.
7. Verify HTTPS, CORS preflight from the exact frontend origin, cookie issuance/rotation/clearing, `/health`, `/ready`, and a login/logout flow on the two custom domains.

Render's proxy configuration and hop count can change with deployment topology. Confirm the provider's current request path and configure `TRUST_PROXY_HOPS` accordingly; do not blindly trust all forwarded headers. The current rate limiter uses in-memory per-process storage. Keep the API to one instance for the initial controlled launch, or add a shared rate-limit store before scaling across instances.

### Production database

- Use the provider's private/TLS connection string as `DATABASE_URL`; don't expose it in frontend build settings.
- Restrict database ingress to the API service and approved migration task.
- Keep backups and migration permissions separate from ordinary application access where the provider allows it.
- Test migration and rollback/recovery procedures against staging before production. SQL down-migrations are not supplied; recovery from a destructive migration requires a tested backup/restore or a separately prepared forward fix.

## Security, privacy, and operations

- API authorization checks the current database role against the signed token role, and candidate/employer/admin endpoints enforce their required role. Employer request and candidate-match reads are scoped to the authenticated employer. Candidate information is returned to an employer only for an administrator-authorized match while the candidate's current sharing consent is active.
- API inputs use strict Zod schemas; sensitive state transitions are explicit; access tokens are short-lived, restricted to HS256 with issuer/audience checks, and held in frontend memory; rotating refresh tokens are stored hashed in the database and sent in an HttpOnly cookie.
- Refresh rotation uses a transactional compare-and-swap; reuse of a stale token revokes the remaining token family. Login, registration, refresh, and public forms have route-specific rate limits in addition to the API-wide limit.
- Helmet, exact-origin credentialed CORS, origin checks, and JSON body limits are configured. `TRUST_PROXY_HOPS` must match the host so rate limiting sees client addresses correctly.
- Vercel static responses receive basic security headers from `vercel.json`. A strict frontend Content Security Policy is not preconfigured because its `connect-src` must include the actual API hostname; configure and verify a restrictive policy after selecting the production domain.
- `npm.cmd audit --audit-level=high` checks known dependency advisories. This is not a penetration test or a security certification.
- Rate limits are in-memory and reset on process restart; they are not coordinated between API instances. Add a shared store before horizontal scaling.
- Logs intentionally avoid request bodies and credentials. Configure provider logs/alerts and an operational incident process before accepting real data.
- Contact messages are stored only; email delivery and notifications are not implemented. Password recovery, candidate account/data deletion, retention automation, and user export are not implemented.

## Accessibility, performance, metadata, and assets

- The interface supports keyboard focus styles, a skip link, labeled form controls, reduced motion, and responsive layouts. A prior browser pass (before modularization) found no horizontal overflow at 320, 360, 390, 768, 1024, or 1440px and verified that the first Tab on the candidate page reaches “Skip to main content,” which targets the page's main landmark. Post-refactor routes/responsiveness need browser re-verification. An automated axe audit and assistive-technology review have not been performed.
- The frontend includes route-specific document titles/descriptions, Open Graph metadata, `en-NG` language/locale, canonical URLs when `VITE_SITE_URL` is configured, and noindex directives for account/auth/draft-privacy routes. Vite is a client-rendered SPA; no server rendering or static per-route prerendering is configured.
- The home artwork is CSS-generated and no stock photos or third-party employer/candidate identities are used. DM Sans and Playfair Display load from Google Fonts under the SIL Open Font License 1.1. See [ASSET_ATTRIBUTION.md](./ASSET_ATTRIBUTION.md).
- Latest production build output after frontend modularization: main JavaScript 323.60 kB (97.56 kB gzip), lazy dashboard chunk 19.37 kB (4.63 kB gzip), CSS 47.16 kB (10.65 kB gzip), and HTML 1.70 kB (0.74 kB gzip). No Lighthouse score, Web Vitals, or load/concurrency benchmark has been collected.
- Final local checks passed: production frontend/API build, Oxlint, 44 tests across 9 files, and `npm.cmd audit --audit-level=high` (zero advisories). Migration SQL also passed the documented PGlite smoke test; the actual managed PostgreSQL provider has not been tested.

## Launch blockers and known limitations

Do not enable online collection or announce a production launch until all of these are addressed:

1. Replace and review the draft privacy notice, including data-controller details, lawful basis, data processors/transfers, contact channel, retention, access/deletion process, and incident response. Obtain appropriate legal review; this README is not legal advice.
2. Replace the visible placeholder contact details with monitored, approved business contact information and provide the missing terms of service.
3. Select the production domain, hosting plans/regions, secret-management approach, managed database, backup retention, and recovery objectives.
4. Apply migrations against the actual staging and production PostgreSQL provider, test real sign-in, cookie behavior, registration/submission gates, and complete critical workflows.
5. Configure monitoring/alerts, a shared rate-limit store if scaling, log retention, incident response, and operational ownership.
6. Decide how user data deletion/export, retention expiry, password recovery, and employer/candidate notifications will work.
7. Configure and verify a restrictive frontend Content Security Policy with the selected API and Google Fonts origins; verify the Vercel security headers on the deployed domain.

No hosting provider, database, production environment, custom domain, legal notice, contact channel, or production secret has been configured from this workspace. The application has not been deployed.
