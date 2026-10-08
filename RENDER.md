# Render deployment

The user requested Render on 2026-10-08 and selected **a free preview with telephone/email contact**. The prepared configuration is not evidence of a completed deployment. The destination is [NikolaEnkin/transcommunity-logistic](https://github.com/NikolaEnkin/transcommunity-logistic). Access to the user's Render workspace is still needed.

Start with [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FNikolaEnkin%2Ftranscommunity-logistic), sign in, authorize this repository if requested, and review the single free web service before deploying.

## First deployment

Publish the contents of this `site/` Git repository to a dedicated repository. Do not include the parent scraped archive, `.env`, `.local/`, browser reports, `node_modules/`, or the previous `.openai/` hosting identity.

In the [Render dashboard](https://dashboard.render.com/), select **New → Blueprint**, connect that repository and use `render.yaml`. Review the single free Node web service and create it. No database, persistent disk, paid plan, custom domain or automatic redeployment is requested by this Blueprint.

If creating a Web Service manually instead, use:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Region | Frankfurt |
| Root directory | Empty when this repository contains `site/` contents at its root |
| Build command | `npm ci --omit=dev && npm run build && npm run check` |
| Start command | `npm start` |
| Instance | Free |
| Health check | `/healthz` |
| Auto deploy | Off |
| `NODE_VERSION` | `24.14.0` |
| `NODE_ENV` | `production` |
| `MAIL_MODE` | `disabled` |
| `SEARCH_INDEXING` | `false` |

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. Production binds to `0.0.0.0`; `npm run dev` still binds to `127.0.0.1`. Build metadata uses the Render URL automatically. Do not select a Static Site: the Node service supplies real error statuses, form availability and the hard-refresh hint.

Free services sleep after inactivity and may take time to start again. Their filesystem is temporary. The preview therefore disables both JavaScript and native enquiry submission, shows the translated direct-contact message, and writes no customer records. Telephone and email links remain available. These restrictions follow [Render's free-service documentation](https://render.com/docs/free).

## Verification after deploy

- Open the assigned HTTPS URL and `/healthz` (expect `200` and `{"ok":true}`).
- Check `/`, `/en/`, `/fr/`, `/de/`, the digital-solutions page and each localized contact page on desktop and mobile.
- Confirm the contact form is unavailable and the real telephone/email links work; no local-test success may be shown.
- Open a missing path (expect the localized `404` with actual HTTP `404`), plus `/400.html` and `/500.html` with their respective statuses.
- Check logo rendering, four-second carousel and intro behavior with a normal versus cache-bypassing refresh.
- Confirm canonical/hreflang/sitemap URLs use the assigned Render URL and `X-Robots-Tag: noindex, nofollow` is present.

Use `npm run build`, `npm run check`, `npm run test:api`, `npm run test:production` and the browser suite before publishing later changes. Deployment verification must still be performed against the live URL; local checks cannot establish that a Render deployment succeeded.

## Enabling enquiries later

Requires a separately approved paid service and persistent disk. Mount the disk at `/var/data`, then set `PERSISTENT_STORAGE=true`, `ENQUIRY_DIR=/var/data/enquiries`, and `MAIL_MODE=inbox` or `smtp`. The startup guard rejects enabled public enquiries without explicit persistent-storage configuration. The environment flag is an operator declaration: it does not create or verify a Render disk by itself. Keep one instance; file idempotency and rate limits are process-local. Review private records through authorized server access; no public administration screen is provided.

`inbox` saves a private receipt without claiming an email was sent. `smtp` also requires the SMTP settings in `.env.example` and confirmed access to the provider; keep secrets in Render environment settings. Existing pending/unconfirmed receipts are not retried automatically. Free Render services block standard outbound SMTP ports.

## Domains and request security

No company DNS change is included. For an approved custom domain, add it in Render, set `APP_ORIGIN` and `SITE_ORIGIN` to its HTTPS origin, and rebuild. `ADDITIONAL_ORIGINS` accepts comma-separated additional HTTPS origins for other attached domains. Render's supplied HTTPS URL remains allowed. Each enquiry must use an Origin matching its own request Host; forwarded host/protocol headers do not bypass this check. Host checks remain strict except for the information-free `/healthz` probe, which accepts Render's internal probe Host.

Only when `RENDER=true` does the service use Render's overwritten `CF-Connecting-IP` for rate limiting; otherwise it uses the socket address. Caller-supplied `X-Forwarded-For` is ignored. This trust applies specifically to public Render web services, as described in [Render's proxy guidance](https://render.com/articles/host-pocketbase-on-render). Do not reuse this proxy setting on an unprotected public server.

After domain and content review, `SEARCH_INDEXING=true` permits indexing. Preview defaults keep indexing disabled. HTTP/TLS termination and HTTPS redirects are handled by Render's edge.

Configuration reference: [Render Blueprint specification](https://render.com/docs/blueprint-spec).
