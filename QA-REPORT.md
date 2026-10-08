# Local validation report

Validated on 8 October 2026 with Node 24.14.0, installed headless Google Chrome, Playwright 1.64.0, axe-core 4.13.0 and Lighthouse 13.5.0. All changes, previews, browser requests and SMTP tests stayed local. No deployment or remote source push was performed.

## Intro verified before the service/form iteration

The original logo appears above a native progress bar and percentage. Browser tests verify first navigation, reaching 100%, unlocking the page, skipping ordinary reloads, replaying actual cache-bypassing reloads via Chrome CDP, skipping internal navigation and history, reduced motion, JavaScript disabled and a deliberately stalled font request. The 4.5-second timeout releases the content. The regression test passed again after all changes.

Hard-refresh detection uses the Node server's request-header hint. Browsers classify both kinds of refresh as `reload`; this implementation cannot universally distinguish a hard refresh from DevTools Disable cache or other no-cache reloads. Chrome is verified; Firefox/Safari shortcut behavior is untested. Intro progress presents critical-resource readiness, not an exact network-byte percentage.

## Pages, responsive layout and accessibility

- Build: 40 complete localized pages (ten pages × four languages).
- Static checks: 2,128 local references resolve; language, one h1, unique IDs, form labels, source contacts, hreflang, distinct titles within each language, sitemap, JSON-LD and CSP hashes verified.
- Layout: all 40 pages at 390px and 1440px, 80 checks, no horizontal overflow.
- Enlarged text: all 40 pages with 200% root text at 320px and 768px, 80 checks, no horizontal overflow.
- Accessibility: all 40 pages scanned at mobile width with axe WCAG 2 A/AA, 2.1 A/AA, 2.2 AA and best-practice rules; zero reported violations.
- Keyboard: service tabs and arrow navigation, language switching, mobile menu and desktop service disclosure, Escape closing and focus behavior checked. Home/End and roving focus remain implemented.
- Without JavaScript: all home services remain readable; service pages render complete content; the contact form produces a localized server receipt.
- Screenshots: home, service and contact screens reviewed on mobile/desktop. The mobile logo was enlarged, a promotional collage caption corrected, and visible BG language label included in its accessible name.

## Enquiry integration

Eight API integration tests pass. Coverage includes private persistence/receipts; concurrent and restart-safe idempotency; changed-payload conflicts; required/conditional fields; invalid types, lengths and emails; malformed/oversized bodies; unsupported content types; cross-origin/Host rejection; methods; hidden file protection; rate limiting/Retry-After; localized non-JavaScript submission; SMTP errors and configuration.

An isolated TCP SMTP sink verifies an actual Nodemailer exchange, the fixed company recipient, visitor Reply-To, message content and one delivery for a repeated key. No message reaches the real company. TLS configuration and missing credentials are tested separately. Uncertain SMTP delivery never returns success or automatically resends.

Browser tests verify service preselection, conditional fields, error focus, localized local-mode notices and receipts in four languages, reset only after acceptance, network/server error recovery preserving the message and no-JavaScript submission. Temporary test records are removed afterwards. The regular preview stays in local storage mode.

## Mobile Lighthouse

Final local mobile run, including the standard first-navigation path:

| Measure | Result |
| --- | --- |
| Performance | 97 / 100 |
| Accessibility | 100 / 100 |
| Best practices | 100 / 100 |
| First contentful paint | 1.5 s |
| Largest contentful paint | 2.4 s |
| Cumulative layout shift | 0 |
| Total blocking time | 0 ms |
| Speed index | 2.5 s |

The corrected language label also passes the accessible-name audit. HTML/JSON reports, browser results and screenshots are in ignored `qa-artifacts/`. These are lab results from one local machine, not field Core Web Vitals or measured INP. SEO scoring was excluded because the local preview deliberately sends `X-Robots-Tag: noindex, nofollow`; SEO markup is checked separately.

The requested carousel restores the earlier headline and photographic composition. Three WebP assets total approximately 320 KiB; original archive/generated source files are preserved. The first image is high priority and the other two load after the intro releases the content. Text responses use gzip and assets remain self-hosted. The early intro bootstrap intentionally prevents content flashing.

## Automatic background and slogan revision

The user explicitly requested removing the arrows, numbers, pause button and floating caption. These elements and their interaction code are removed from the DOM. The full existing slogan is shown once, on a separate white reading surface immediately below the hero and before the service navigation, in all four languages. The photographic field is decorative (`aria-hidden`) and contains no focusable UI or changing live announcements. The image interval is four seconds with a 1.2-second dissolve; text and contact links stay stable after their initial reveal.

The updated `npm run test:carousel` verifies an actual 1 → 2 → 3 → 1 cycle, continued rotation while hovering/focusing contact links, no hero control buttons or floating caption, complete localized slogan text/placement, stable text geometry, offscreen and document-hidden suspension, four desktop automated accessibility scans, reduced motion staying static beyond a full interval, no JavaScript and failed/stalled image recovery. Mobile/desktop and enlarged-text checks run separately across all 36 pages.

Reduced-motion preferences disable automatic rotation, transitions, drift and reveal. Restoring the normal motion preference resumes background rotation. No user controls are reintroduced. Without JavaScript the first picture and complete slogan remain visible. Original imagery and generation provenance remain documented in `../content/creative/README.md`.

The requested automatic-only treatment does not provide the pause/restart mechanism of a full [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). Automated scan results are not a full WCAG conformance claim. The last recorded Lighthouse table above measured the preceding version with controls; it is not a fresh measurement of this visual refinement.

## Practical limits

Real company photography, team facts, case studies and live SMTP credentials were not supplied. The trust section uses archive-backed business/contact facts. No testimonials, capacities, certifications or operating metrics were fabricated. Native human proofreading, physical-device and screen-reader testing have not been performed. Automated checks do not establish full accessibility conformance.

The local server stores private JSON enquiry records, retained until manually deleted; it is not a public multi-instance mail service or CRM. SMTP acceptance/inbox placement with the company's actual provider remains untested and disabled. The previous remote Sites copy's deletion remains unconfirmed; no new hosted changes were made.

## Calligraphic slogan refinement

The complete translated slogan remains selectable HTML text. Home pages now load self-hosted Great Vibes in Cyrillic and Latin with its OFL license, a darker gold-to-blue text blend, and an aria-hidden SVG flourish inspired by the supplied company wordmark. White-background contrast, print and forced-colors fallbacks are retained. The typography is inspired by the wordmark rather than a claim of its exact unidentified lettering. No animation or image timing changed.

Validation: build and 1,772 local-reference checks passed; the browser suite passed 72 mobile/desktop layouts, 36 axe scans and 72 enlarged-text layouts, plus existing navigation/form checks. Reviewed Bulgarian mobile and desktop screenshots. The wordmark-style slogan wraps naturally on mobile without covering the hero images.

## Adaptive navigation background

The sticky header remains white at the top and above dark sections, then dissolves to deep navy (#0B2034) over 450ms as a light section reaches its lower edge. Direct section surfaces determine the theme; dropdowns do not affect sampling. Links/icons become white, the original logo is rendered in white via CSS, and the enquiry action uses brass. Header geometry stays fixed. Reduced-motion preferences remove transitions; without JavaScript the original white navigation remains functional. Resize, restored scroll and reading-surface layout changes update the theme.

Validation: build, local-reference checks and browser suite passed. The browser suite covers all 36 pages at mobile/desktop sizes and 200% text, plus four-language boundary/reverse-scroll checks, restored reload position, dark-header/open-menu accessibility scans, and normal/reduced-motion transitions. Mobile/desktop dark-header screenshots were reviewed. Menu tests click visible screen coordinates because Playwright locator auto-scrolling moves sticky descendants to their original layout positions; separate mouse/touch checks confirmed reading position is preserved.

## Contacts interactive logo

The original transparent logo appears beside the Contacts introduction on desktop and below it on mobile, in all four locales. CSS perspective, five shallow emblem-depth layers and a soft floor shadow provide a dimensional presentation without changing the original artwork. Movement follows mouse position, horizontal touch dragging or keyboard arrows. Home/Escape and pointer exit restore the resting view; Enter/Space changes perspective. Motion is user-driven only. Reduced-motion preferences and no JavaScript show the static original image.

Validation: build and 1,800 local-reference checks passed. `npm run test:logo` passed mouse, touch, keyboard, reset, unchanged text geometry, preserved vertical touch scrolling, all four localized accessible labels, eight mobile/desktop accessibility scans, live motion-preference changes and no-JavaScript fallback. `npm run test:browser` passed the 72 layouts, 36 accessibility scans, 72 enlarged-text layouts, adaptive header checks, four contact submissions and existing navigation/recovery checks. Contact screenshots at 390px and 1440px, including a tilted desktop view, were reviewed.

## Digital solutions endpoint

Added `/digital-solutions.html` and three localized equivalents with six concrete service scopes, an animated connected-business diagram, keyboard-accessible service selection, user-run illustrative processes, a native project composer, delivery stages and expandable questions. Header, mobile menu, footer, home-page discoverability, SEO alternatives, sitemap and Service structured data include the new endpoint. The header uses its compact menu at intermediate desktop widths to accommodate the new navigation link.

Project choices transfer to Contacts and are validated against the localized service catalogue, including without JavaScript. Unknown/duplicate scope IDs cannot introduce arbitrary prefilled content. The new digital goal field is conditionally required for enhanced enquiries, length-limited and persisted in the local record. Optional SMTP subjects use the correct digital label; real SMTP remains disabled.

Validation: build and 2,128 local references passed. The nine API tests passed, including digital conditional validation, multilingual prefill, safe allowlisted scope and mail labels. Browser checks passed all 40 pages at 390px/1440px, all 40 with 200% text at 320px/768px, 40 mobile accessibility scans, existing navigation/header/forms/recovery checks. Digital-specific checks passed all six service states across four locales (24 additional accessibility scans), keyboard/shared hashes, normal/reduced-motion examples and cancellation, project selection, four enhanced local submissions and a complete no-JavaScript selection/prefill/submission. Mobile and desktop screenshots were reviewed. These are illustrative process previews; no external AI, microphone or production business system is connected.

## Refined interactive service network

The original company emblem replaces the generic central circle; six service-specific symbols and HTML labels replace the decorative SVG labels. Responsive curved paths begin at the emblem edge and end beside the icon rings. Mouse/focus exposes a localized description, highlights the relevant path and sends one finite gold signal. Click/tap selects the corresponding service below; focus transfers to its selector. Reduced motion cancels signals and keeps static feedback. All native service links work without JavaScript. The description grid reserves the longest text's space and does not shift the network on hover.

Validation: build and 2,132 local references passed. Digital tests cover all six network links in four languages, active descriptions and paths, stable geometry, keyboard activation, touch selection, finite normal-motion signals, static reduced-motion feedback and no-JavaScript links. Existing digital demonstrations, 24 service-state accessibility scans, localized enquiry transfer and submissions also passed. General browser checks passed 80 mobile/desktop layouts, 40 mobile accessibility scans, 80 enlarged-text layouts and the existing navigation/form/header regressions. Reviewed live local network detail screenshots at 390px/1440px and its active state. No deployment was made.

## Introductory text reveal — replaces full-page transitions

Removed the rejected whole-page opacity effect, outgoing click interception and navigation delay. The previous navigation script and its obsolete test were removed. Standard, contact and digital introductory copy now uses the homepage's existing `hero-flow-in` animation: 950ms with a 10px upward entrance. Headings, descriptions and digital hero actions animate together; headers, breadcrumbs, backgrounds, contact logo, digital network and lower sections remain at full opacity. The original homepage entrance and four-second image carousel are preserved. The text reveal waits for the first-visit/hard-refresh intro and respects reduced motion; content stays readable without JavaScript.

Validation: build and 2,172 local-reference checks passed. `test:hero` passed all 36 localized inner pages, matching homepage keyframes/timing, full-opacity surrounding elements, native navigation with a delayed response and no outgoing fade, history, intro coordination, reduced motion and no JavaScript. `test:browser` passed 80 layouts, 40 accessibility scans, 80 enlarged-text layouts and existing navigation/header/forms/recovery checks. `test:intro` and `test:carousel` passed their complete existing checks. Reviewed mid-animation screenshots of About, Contacts and Digital Solutions at 390px/1440px: the introductory copy reveals independently while navigation, illustrations and background colors remain intact. Browser automation used local Chrome; physical devices and other browser engines were not tested. All changes remain local.

## Larger typography throughout

Increased the root type size to 112.5% (18px with the default browser setting), enlarging body copy, navigation, controls, forms, labels and footers. Scaled the viewport terms of fluid headings and the slogan equally so their growth matches the rest of the type system. Existing font families, colors, motion and responsive structures are preserved.

Validation: build and 2,172 local references passed. The browser suite passed 80 layouts, 40 accessibility scans, 80 enlarged-text layouts, adaptive-header checks, keyboard navigation, four localized forms and recovery/no-JavaScript checks. Enlarged-text checks now double the new computed baseline (normally 36px). Additional visual measurements at 390px, 1360px, 1440px and 1920px confirmed the 18px body size, no horizontal overflow and a single desktop header row across all four languages. Reviewed home, contact and digital screenshots, including German desktop navigation. All changes remain local.

## Interactive recovery pages

Added 400, 404 and 500 templates in all four languages, with a large centered original logo, CSS perspective/depth, localized explanation, language links and a primary home action. Contacts and error pages share the same logo markup and interaction module. Reduced motion/no JavaScript show the static original. Malformed addresses produce localized 400 HTML, missing pages use their locale's 404, and actual HTML server failures render 500 without leaking exception details. JSON API failures remain JSON. Direct error endpoints return their corresponding statuses with no-store caching; error documents are excluded from indexing and the sitemap.

Validation: build and 2,172 business-page local references passed. All ten API tests passed, including 12 error endpoints, malformed-address handling, localized missing pages, a genuine missing-index server failure, HEAD responses and unchanged JSON errors. `test:errors` passed 24 mobile/desktop accessibility scans, all 12 localized layouts at doubled text size/320px, centered artwork, mouse/keyboard/real touch interactions, static fallbacks and localized home navigation; the interactive desktop state also passed accessibility scanning. Existing Contacts logo tests passed mouse/touch/keyboard/reset, stable copy geometry, vertical scrolling, four locales, eight accessibility scans and fallbacks. Tests now wait for introductory copy animation to finish before measuring stable layout/contrast. Reviewed mobile and desktop recovery screenshots. Restarted the loopback preview only; no deployment was made.

## Larger recovery logo and text

Increased the error-page logo stage from 760px to 1040px, with 12px mobile side gutters. Enlarged the status label/code to 1.25rem (normally 22.5px), headings to a responsive 2–3rem, explanations to 1.125rem and the home action to 1.0625rem. Compact header labels also grew. The changes are scoped to 400/404/500 recovery pages in all four locales; the original artwork and 3D behavior are preserved.

Validation: build, 2,172 local references and format checks passed. The recovery suite passed all 12 localized pages, 24 mobile/desktop accessibility scans, doubled-text layouts at 320px, centered logo, real mouse/touch/keyboard interactions, reduced motion, no JavaScript and localized home recovery. Reviewed updated 404 screenshots at 390px/1440px: the larger logo and type fit naturally with a clear home action. All changes remain local.

## Larger navigation logo

Consolidated the header logo sizing into a responsive 168–260px brand width, up from 110–160px on phones and 158px on desktop. The original full artwork remains uncropped and proportional. Header minimum height follows the logo aspect ratio; desktop group spacing is tighter and the compact menu is used below 1400px. The brand link can use the available flex space at enlarged text sizes.

Validation: build, 2,172 local references and format checks passed. The browser suite passed 80 layouts, 40 accessibility scans, 80 doubled-text layouts and existing sticky-header, menus, keyboard, forms and recovery checks. Additional measurements at 320, 360, 390, 768, 1360, 1400 and 1440px across all four locales found no logo/action overlap or horizontal overflow. Reviewed mobile and French desktop header screenshots; the enlarged wordmark remains complete. All changes remain local.


## Render free-preview preparation — 2026-10-08

Added a production entry point binding to 0.0.0.0/PORT, strict public HTTPS origins, an internal-host-compatible /healthz endpoint, controlled missing-build handling, graceful shutdown and Render-specific CF-Connecting-IP rate limiting. Local preview remains loopback-only. render.yaml selects one free Frankfurt Node service, no paid resources and manual deployments. Build metadata uses Render's public URL. Public enquiries default to disabled; all four contact pages show the direct-contact notice and disable native/JavaScript submission without writing records. Optional future inbox/SMTP modes require an explicit persistent-storage declaration and a private absolute directory.

Validation: official Render JSON Schema accepted render.yaml. Exact production-only dependency installation, build, 2,172 references and production startup succeeded in an isolated source copy; the generated canonical URL used the supplied Render URL. Ten existing API tests and six production tests passed, covering all 40 business pages, health/readiness/HEAD, Host/Origin forgery, real error statuses, free-preview form rejection in four locales, no persistence, private/idempotent inbox behavior and proxy trust. The existing browser suite passed 80 layouts, 40 axe scans, 80 doubled-text layouts, navigation/header/forms and recovery. Sixteen additional Chrome contact checks covered four locales at two widths with and without JavaScript; the disabled form and direct contact links remained correct. Reviewed the Bulgarian mobile preview screenshot.

Prepared artifacts/transcommunity-render.zip outside site/ with source, public assets, lockfile and configuration; excludes .env secrets, .local receipts, .git, node_modules, browser reports, generated dist and the previous Sites identity. The archive was extracted and used for the isolated production build. No Render deployment or GitHub upload was performed: a destination repository and Render account access were not supplied. Live HTTPS, platform startup behavior, DNS and delivery have not been verified.
