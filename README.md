# Transcommunity Logistic

[Deploy the free preview to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FNikolaEnkin%2Ftranscommunity-logistic)

The user authorized a Render deployment on 2026-10-08 and selected a free preview with direct telephone/email contact. Local development remains loopback-only. See [RENDER.md](RENDER.md) for the deployment configuration and remaining account setup.

The local development workspace retains the previous hosting identity separately for removal/status tracking; it is excluded from this deployment repository.

The website has 40 fully rendered business pages and 12 error pages in Bulgarian, English, French and German. It uses HTML, CSS, small JavaScript modules and a Node server with separate local and production entry points. Nodemailer is the only runtime dependency. There is no analytics, tracking cookie, remote font request, account system or automatic external request in the browser.

## Run locally

Requires Node.js 22.19 or later for the complete development and Lighthouse toolset. Tested with Node 24.14.0 and installed Google Chrome.

Run these commands from the cloned repository root (or `site/` in the original local workspace):

```sh
npm ci
npm run build
npm run dev
```

Open `http://127.0.0.1:4173`. The server binds only to `127.0.0.1`. Do not expose it through a public tunnel. `PORT` can change the local port. Static files alone do not provide enquiry handling or the hard-refresh hint.

```sh
npm run check
npm run test:production
npm test
npm run test:performance
```

Browser tests use installed Google Chrome on macOS. Set `BROWSER_EXECUTABLE` for Playwright on another machine and `CHROME_PATH` for Lighthouse. API, browser and intro tests start isolated loopback servers. API/browser test records use disposable temporary directories; the SMTP integration test uses a temporary local sink and sends no real email. Lighthouse requires the regular local preview on port 4173. Reports and screenshots are in ignored `qa-artifacts/`. `npm run test:carousel` separately checks the real automatic loop, absence of controls, slogan placement and image-failure recovery. `npm run test:logo` checks Contacts logo perspective, mouse/touch/keyboard controls, vertical scrolling, localized accessibility and static fallbacks. `npm run test:digital` checks six solutions, process examples, keyboard navigation, project composition, localized enquiries and the complete no-JavaScript enquiry flow.

## Pages and editing

Bulgarian keeps the five legacy paths: `/`, `/about.html`, `/strategy.html`, `/purpose.html`, `/contacts.html`. Four dedicated service paths are added: `/warehousing.html`, `/international-trade.html`, `/partner-logistics.html`, `/consulting.html`. The new `/digital-solutions.html` page covers six digital directions. All ten pages also exist under `/en/`, `/fr/`, and `/de/`. Language changes preserve the page. Localized `/400.html`, `/404.html` and `/500.html` (also under the three language prefixes) provide centered interactive logo recovery and return their actual HTTP status. Malformed addresses, missing pages and HTML server failures use these designs; JSON API errors remain JSON. Error pages are excluded from the sitemap. `npm run test:errors` checks layouts, accessibility, controls, static fallbacks and home recovery.

- `src/content.mjs`: original company content, four translations and exact contact details.
- `src/upgrades.mjs`: detailed services, enquiry-field mapping, localized form states, concrete hero and company facts.
- `src/build.mjs`: complete HTML, service pages, canonical/hreflang links, Organization/Service structured data, sitemap and CSP hashes.
- `src/styles.css`: mobile-first layouts, design tokens, restrained motion, print and reduced-motion rules.
- `src/intro.js`: independent first-visit loader and failure recovery.
- `src/header.js`: surface-aware sticky navigation with a 450ms white/navy dissolve, matching link/icon colors and reduced-motion support.
- `src/carousel.js` and `src/carousel-content.mjs`: automatic three-image background, four-second loop, contact translations and motion preferences.
- `src/logo.js` and `src/logo-content.mjs`: interactive CSS 3D presentation of the original company logo on Contacts and recovery pages, with localized accessible instructions.
- `src/brand-view.mjs` and `src/error-view.mjs`: shared original logo markup and localized 400/404/500 recovery templates.
- `src/digital-content.mjs`, `src/digital-view.mjs` and `src/digital.js`: four-language digital offer, connected diagram, service selector, illustrative processes and native project composer.
- `src/main.js`: accessible menus/tabs, conditional fields, validation and enquiry submission.
- `server/app.mjs`: static pages, enquiry API, validation, persistence, health checks and security headers.
- `server/production.mjs` and `scripts/start.mjs`: HTTPS origin allowlist, Render proxy handling, persistent-storage guard and production startup.
- `server/mail.mjs`: optional TLS SMTP adapter.
- `public/assets/`: original logo/imagery and self-hosted Golos Text and Great Vibes with their OFL licenses.

All business copy is readable without JavaScript. The enquiry form also supports a non-JavaScript HTML submission; service-specific details are optional in this fallback and the visitor can explain the need in the message.

## Intro behavior and browser limit

The original, uncropped logo appears above a native progress bar and percentage. It reaches 100% after critical images/fonts are ready and a short minimum presentation time, then fades out. Reduced motion removes the minimum delay and transition. A 4.5-second timeout always releases the page if a critical resource stalls. With JavaScript disabled the overlay stays hidden.

The intro plays once per tab session and on a reload with a cache-bypass request hint. Ordinary reloads, internal page changes and history navigation skip it. The Node server recognizes `Cache-Control: no-cache` or `Pragma: no-cache` on the HTML request and inserts a small metadata hint. Playwright verifies a normal Chrome reload and an actual CDP `Page.reload({ignoreCache:true})`.

Browsers expose both normal and hard refresh as navigation type `reload`; there is no universal hard-refresh API. A reload with DevTools **Disable cache** or another source of `no-cache` is indistinguishable from a hard refresh and can replay the intro. Firefox/Safari shortcuts and other hosting stacks have not been verified. Session storage can also be unavailable in restrictive browsing modes. The site remains usable in all of these cases.

## Enquiry behavior

Default `MAIL_MODE=local` saves accepted enquiries as private JSON files in `.local/enquiries/`. No email is sent. The form says this before submission and in the success receipt. `ENQUIRY_DIR` can select another private directory. Records contain contact details, selected service, relevant service fields, message, timestamp and a receipt reference. They are never served as public files, logged or saved in browser storage. The directory is created with permissions `0700`, records with `0600`, and `.local/` is ignored by Git. Local records remain until the developer deletes them; there is no invented retention promise or public administration page.

The API enforces required fields, email format, string lengths/types, a 16 KiB request limit, known services/languages, conditional details, same-origin requests and loopback Host values. It applies 12 attempts per IP per 15 minutes and includes Retry-After guidance. A honeypot rejects filled automation fields. UUID idempotency keys prevent double submission and survive server restarts; a changed payload with the same key is rejected. Browser errors preserve the form. Success resets it only after a confirmed response.

### Optional SMTP configuration

No provider, credentials or new real company photos were supplied. Live delivery is disabled.

To configure mail later, copy `.env.example` to ignored `.env`, enter the provider values locally, set `MAIL_MODE=smtp`, and use:

```sh
npm run dev:local-env
```

Use an authenticated sender authorized by your provider. Port 465 uses implicit TLS; other ports require STARTTLS. The recipient is fixed to `office@transcommunitylogistic.com`; the visitor's validated address is Reply-To. File/URL attachment access is disabled. Secrets never enter `dist/` or API responses.

SMTP success means the recipient was accepted by the mail server; it does not guarantee inbox placement. A timeout or SMTP failure returns an error, preserves an unconfirmed record and never claims delivery. Retrying the same idempotency key does not send a second potentially duplicate email; check the record/provider or contact the business directly if delivery remains uncertain. Email is not automatically activated by installing dependencies.

## Content provenance and trust

`../content/legacy/` preserves the user's scraper output: HTML, rendered HTML, text, structured content, assets, manifests and checksums. `../scripts/scrape_legacy.py` uses the existing scraper read-only from `Desktop/SmartVerse/Scraper-OCR`. The five supplied Bulgarian pages and their linked English versions are archived; French/German are new translations.

The new trust section uses only the company name, Plovdiv address, telephone, email and service scope in that archive. The images are original-site promotional collages, not asserted photographs of company premises. No team portraits, testimonials, case studies, registration numbers, certifications, years of operation, shipment counts, capacity or delivery guarantees were invented. Real company photography and independently supplied business facts can replace the collages later. Digital warehouse management, tracking and market expansion remain future ambitions. Human native-language proofreading is still advisable; it is not claimed as completed.

## SEO, performance and validation

The build uses `--origin`, `SITE_ORIGIN`, `APP_ORIGIN`, or `RENDER_EXTERNAL_URL`, in that order, for canonical URLs, reciprocal hreflang, Organization/Service JSON-LD and the sitemap, falling back to the existing business domain locally. Metadata does not publish anything or change DNS. Both servers deliberately send `X-Robots-Tag: noindex, nofollow` by default; production indexing requires explicitly setting `SEARCH_INDEXING=true`.

The requested photographic hero uses three optimized WebP images with a four-second loop and 1.2-second crossfade. The original hero copy is restored. There are no arrows, numbers or pause/play buttons, as explicitly requested. The full slogan sits on a separate white strip beneath the hero and above the service navigation. Its selectable, translated text uses self-hosted Great Vibes calligraphy, a readable gold-to-blue blend and a decorative curved flourish inspired by the supplied wordmark. Great Vibes is sourced from the [Google Fonts distribution](https://github.com/google/fonts/tree/main/ofl/greatvibes) and includes Cyrillic/Latin subsets, with its OFL license alongside the files; only home pages load its CSS. Rotation continues while hovering or focusing the contact links; hidden/offscreen pages suspend it, and reduced-motion preferences keep the first image static. Only the first image participates in intro readiness; subsequent images prepare afterwards. Fonts and logo are self-hosted, below-fold images are lazy-loaded, text responses are gzipped and assets cached for a day. The local server applies the generated CSP hashes and security headers. Review `QA-REPORT.md` for measured results and practical test limits.

The navigation stays white at the top and over dark sections. As a light reading surface reaches its lower edge, it dissolves to deep navy with white links/icons and a brass enquiry action. Opening a dropdown leaves its theme unchanged. The original logo is rendered in white on navy; dropdowns retain their white reading surfaces. Reduced-motion preferences remove transitions; without JavaScript the header remains white and functional.

On Contacts, the company logo sits beside the introduction on desktop and below it on mobile. The original transparent artwork is presented with CSS 3D perspective, a shallow layered emblem edge and a floor shadow. Mouse movement, horizontal touch dragging and keyboard arrows change the viewing angle; Home/Escape and pointer exit reset it. Keyboard Enter/Space switches perspective. Vertical touch scrolling is preserved. No continuous animation or WebGL dependency is added. Reduced motion and JavaScript disabled both display the original static logo.

## Digital solutions

`/digital-solutions.html` and its EN/FR/DE versions cover websites, voice assistants, chatbots, ERP, CRM and AI workflows. The page is discoverable from the main navigation, mobile menu, footer and a home-page section. The six-direction selector supports keyboard arrows, Home/End and shareable service hashes. Process examples are explicitly illustrative and animate only when requested; reduced motion completes them immediately, and switching solutions cancels pending steps. No microphone or external AI connection is requested.

The project composer uses a native GET form. Multiple selected directions are carried to Contacts, where the loopback server validates their IDs against the localized catalogue and preselects `digital` plus the project scope. This works without JavaScript too. Enhanced submission requires the digital goal field; server validation, private local persistence and optional SMTP labels include the new category. The original four logistics/trade/consulting service pages remain available.

The digital hero network now uses the company's existing emblem, six accessible service links and thin connections aligned to the actual responsive layout. Pointer/focus shows the localized service description and highlights its path; normal motion adds one brief gold signal. Clicking or tapping selects the matching service and moves to the workbench. Description space is reserved using all localized text lengths to avoid shifting the diagram. Reduced motion keeps feedback static; without JavaScript all six native links still reach readable service content. The emblem is cropped through CSS from the original logo asset.
