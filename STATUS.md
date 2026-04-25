# Saint Helen 3.0 — Build Status

> **Read this first, every session.** This is the running log of what's shipped, what's in flight, what's queued, and what's broken. It pairs with `CLAUDE.md` (rules) and `/design-ref/` (specs). Update it after every meaningful step.

Last updated: **2026-04-25**

---

## At a glance

| Step | Title | Status |
|---|---|---|
| 0 | Project setup | ✅ Done |
| 1 | Design system | 🟡 In progress (basic version live; a11y widget + full components.html parity pending) |
| 2 | Database (Drizzle schema + seed) | ✅ Done (schema applied to Neon, dev seed run) |
| 3 | Public site — homepage + 3 interiors | ✅ Done (4 routes wired to DB, filters URL-synced, build green) |
| 4 | Admin shell, auth, ministry edits, matchmaker editor | ✅ Done (Waves A–D — all editors live + matchmaker + /ministries) |
| 5 | Upload + CDN (Vercel Blob) | ✅ Done — uploads in events/ministries/staff/seasonal-banners + bulletins (PDF) + public viewer |
| 6 | Public API routes | 🟡 Done for launch — welcome / readings / mass-times wired; prayer-request and revalidate deferred |
| 7 | Backups + staging | ⏸️ Deferred (backups, B2 off-platform copy, staging branch — revisit before launch) |
| 8 | External integrations (Resend / Twilio / Fathom / Subsplash) | ⬜ Queued |
| 9 | Polish — contrast, summary rename, ministry hides, mass simplification, taxonomies, media library | ✅ Done |
| 10 | Rich text editor (TipTap) | ✅ Done — TipTap in events / ministries / staff; sanitize-html on render |
| 11 | Per-ministry forms + leads dashboard | ⬜ Queued |
| 12 | Blog + megamenu + nav editor | ⬜ Queued |
| 13 | Sections + embed allowlist + matchmaker skip-rules | ⬜ Queued |

Build sequence is from `design-ref/pages/backend.html §16` (Steps 1–8) + the resolved post-Step-6 scope memory (Waves 9–13).

---

## ✅ Shipped — basic Vercel-ready version

Pushed by Matthew so he can wire Vercel and provision Blob + Neon before we go further.

- `/website` Next.js 15.5.15 + React 19 + Tailwind 4 + TypeScript scaffolded with pnpm.
- All design tokens from `design-ref/assets/colors_and_type.css` ported into `app/globals.css`. Both `:root` (runtime CSS vars — needed for density-scale and the a11y widget) and `@theme inline` (Tailwind 4 utility generation).
- Libre Baskerville + Libre Franklin loaded via `next/font/google` and bound to `--font-libre-baskerville` / `--font-libre-franklin`. Headings use serif, UI uses sans, matching `design-notes.html §01`.
- `app/(site)/layout.tsx` wraps public pages with `Header` + `Footer`.
- `app/(site)/page.tsx` — homepage stub: hero, Mass-times card with placeholder schedule, build-status callout linking to `/design-system`. Photo placeholder component included per the placeholder-friendly system.
- `app/design-system/page.tsx` — token reference: color groups, type scale, button variants, radii, shadows.
- `Header` is sticky navy with parish wordmark, primary nav stub, rust Give CTA. Not yet sticky-aware on scroll, no mega-menu, no mobile sheet.
- `Footer` is navy-dark with three link columns + address.
- Verified clean: `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass. `pnpm dev` boots and `/` + `/design-system` return 200.

### Known shortcuts in this commit

These are deliberate so we can deploy quickly and fill them in over the next steps. None block a Vercel preview deploy.

- No actual logo image — wordmark only. `design-ref/assets/logo-*.png` will be copied to `public/` when we wire imagery.
- No mega-menu, no mobile menu sheet, no sticky-on-scroll behavior on the header.
- No favicon swap — still default Next.js favicon.
- No `metadata` icons / OG image / robots.
- No real photography anywhere — every image is the styled placeholder.
- No `sitemap.ts` / `robots.ts`.
- No fixtures directory yet — homepage hard-codes its placeholder Mass times inline.
- No tests yet (Vitest / Playwright / axe-core). Coming with Step 1's a11y widget so the widget itself can be tested.

---

## 🟡 In progress — Step 1: design system

**What's left to call Step 1 done:**
- shadcn/ui base setup with token-aware `Button`, `Tag`, `Card`, `Dialog`.
- A11y widget (`components/a11y-widget.tsx`) per `backend.html §13` — five controls, `data-*` attrs on `<html>`, gated by `ENABLE_A11Y_WIDGET`.
- `/design-system` page expanded to mirror every component in `design-ref/pages/components.html` (currently it covers tokens + buttons only).
- Test infra: Vitest for component tests, Playwright for E2E smoke, axe-core in CI on `/` + interior pages.

---

## ✅ Shipped — Step 2: database

Schema lives at `website/db/schema.ts`; migrations at `website/db/migrations/`; seeds at `website/db/seed/`. Applied against the Neon instance pointed at by `DATABASE_URL` in `.env.local`.

- **13 tables**: the 7 content tables from `backend.html §03` (`events`, `mass_times`, `ministries`, `staff`, `bulletins`, `seasonal_banners`, `site_settings`), Auth.js canonical (`users`, `accounts`, `sessions`, `verification_tokens`) with `role` / `phone` / `preferred_auth_method` / `ministry_id` additions from §07, plus `blob_assets` (our app-owned asset registry) and `ministry_edits` (the dark-flagged self-service queue).
- **No `locale` columns** — Spanish deferred per resolved decisions.
- **Singleton enforced** on `site_settings` via `CHECK (id = 1)`.
- **Circular FK** `users.ministry_id → ministries.id` + `blob_assets.uploaded_by → users.id` handled with `AnyPgColumn` return-type annotations on the lazy `.references()` arrows — standard Drizzle pattern for cycles.
- **Indexes** beyond primary/unique: `events` on `starts_at` + `status`; `ministries` on `status` + `category`; `mass_times` on `day_of_week` + `override_date`; `seasonal_banners` on `(starts_at, ends_at)`; `ministry_edits` on `ministry_id` + `status`.
- **Runtime connection** `db/index.ts` uses `@neondatabase/serverless` (Edge-safe). CLI scripts (seed / check / migrate) read `.env.local` via `tsx --env-file`.
- **Seed**: singleton `site_settings` with parish defaults + day-1 admin `mboyle@sainthelen.org` (role `admin`, placeholder E.164 phone, email auth preferred) + 4 staff (Fr. Tom / Fr. Luis / Maria Chen / Paul Rivera) + 8 ministries covering worship / formation / fellowship / service / sacraments / music / service / formation + 5 events (Harvest Fest, Confirmation Retreat, Lenten Soup Supper, Mother's Day Brunch draft, Corpus Christi Procession) + 10 mass_times rows (Saturday vigil + 4 Sunday + 5 weekday).
- **Bulletins + seasonal banners + blob assets + ministry edits — not seeded.** They require real blob-storage content, which lands in Step 5.
- **Scripts**: `pnpm db:generate | db:migrate | db:push | db:studio | db:seed | db:check`. Seed is **idempotent** — second run inserts 0 rows, counts stay stable.
- Build gates all green: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### Things to flag to Matthew before Step 3 touches the DB

- The placeholder phone on the day-1 admin is `+15555551234`. Update via `/admin/account` once SMS sign-in is live (Step 4), or edit `users.phone` directly in Neon before then.
- `site_settings.giving.primaryUrl` is an empty string. No Touchpoint URLs seeded — they go in through `/admin/settings/giving` in Step 4.
- The migration was run against the single Neon branch behind `DATABASE_URL`. Once we create a `staging` Neon branch (Step 7), we'll run the migrations there too.

---

## ✅ Shipped — Step 3: public site

All four routes from the spec render real data from Neon. Build prerenders `/`, `/im-new`, `/mass`, `/design-system` as static with ISR; `/events` is dynamic because it reads search params. Bundle: 118–120 kB First Load JS for static routes; `/im-new` is 193 kB with the React Hook Form + Zod welcome form bundle.

- **Homepage** `/` — hero with search-less CTAs + "This Sunday" peek, optional seasonal banner (hidden when none active), serve grid (two big tiles + four small), pastor welcome (static copy — video slot waiting), **Find your place** with two spotlight ministries from DB, **Featured events** from DB (filtered by `isFeatured = true` + future-only), bulletin placeholder, stewardship CTA.
- **`/im-new`** — interior hero, three-step "Your first Sunday," welcome form card (RHF + Zod, client-side validation, `onSubmit` logs to console until `/api/welcome` lands in Step 6), what-to-expect tiles driven partly by `siteSettings.address`.
- **`/mass`** — interior hero, day-picker client island (defaults to today, ←/→/Home/End keyboard nav, aria-tablist), today's schedule from `mass_times` joined to `staff` for presider, readings placeholder with outbound link to USCCB until Step 6's Edge proxy ships, livestream slot waiting for Subsplash widget, full weekly rhythm (vigil / Sunday / weekday groups).
- **`/events`** — interior hero, featured event pinned at top, URL-synced filter sidebar (audience + category, client island that pushes searchParams with `router.push`), substring search via `?q=`, grouped by month, active-filter summary with result count.
- **Shared primitives** in `components/site/`: `InteriorHero`, `PhotoPlaceholder`, `SectionHead`, `EventCard`, `MinistryCard`, `ServeTile`, `GiveFab`. Client islands: `components/mass/DayPicker`, `components/events/EventsFilters`, `components/forms/WelcomeForm`.
- **Co-located queries** in `lib/queries/*.query.ts`, all wrapped in `unstable_cache` with a tag per content type (`events`, `ministries`, `mass-times`, `staff`, `site-settings`, `seasonal-banners`). Admin mutations in Step 4 will `revalidateTag("events")` etc.
- **Date helpers** in `lib/dates.ts` — `unstable_cache` serializes query results through JSON, which turns `Date` into ISO string. All date consumers go through `toDate()` so they work whether the value is live or cached.
- **Feature flags** in `lib/flags.ts` — `ENABLE_GIVE_FAB`, `ENABLE_LIVESTREAM`, `ENABLE_A11Y_WIDGET` default true; `ENABLE_MINISTRY_SELF_SERVICE` default false. Read `NEXT_PUBLIC_*` for client-exposed flags.
- **Mobile Give FAB** — hidden above 760 px, hidden before 400 px scroll, hidden on `/give`, dismissible per session.
- Build gates all green: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### Step 3 — deliberately deferred (add later)

- **5&THRIVE video rundown section** on homepage — out of schema scope (needs a videos table / YouTube embed config). Revisit when a dedicated content type is worth it.
- **Post-Game podcast section** — same situation; would need a podcast episode table or a pull from an RSS feed.
- **Faith at every age tiles** — static links to pages we haven't built (`/kids-corner`, `/faith-formation`, etc.). Add once the navigation IA is finalized.
- **Bulletin modal + archive** — awaits bulletin seed data, which awaits Step 5's Vercel Blob upload flow.
- **Ministry Matchmaker modal** — awaits the form-based manifest editor in Step 4.
- **Hero search** — backend.html §17 lists full-text search as deferred. Hide the search input until there's something to search.
- **USCCB readings proxy** — Step 6 (`/api/readings` Edge handler).
- **Subsplash livestream embed** — waiting on Matthew to supply the widget.
- **Pastor's welcome video** — waiting on a recording.
- **Header mega-menu + mobile sheet** — current header is a simple sticky bar; rich navigation lands alongside Step 1 followups (shadcn's `NavigationMenu` + `Sheet`).
- **Real `/events/[slug]` detail pages** — homepage + events list link to them already; detail template itself is a Step 3 follow-up once admin editor lands.
- **`/ministries`, `/ministries/[slug]`, `/bulletin`, `/give`, `/contact`** — linked from nav and homepage but pages aren't built yet. Next.js will 404 until we scaffold them. Fine for internal review; flag before external stakeholders visit.

### Step 4 · Admin — Wave A done

✅ **Auth foundation + admin shell + events editor are live.** Build green. End-to-end auth round-trip verified locally: /admin gates → /sign-in → magic link logs to server console → click → session set → /admin dashboard renders with seeded data.

- **Auth.js v5** (`next-auth@beta`) with Drizzle adapter. JWT sessions, 30-day expiry. `auth.config.ts` is the edge-safe slice imported by `middleware.ts`; `auth.ts` is the full Node-only setup that wires the providers.
- **Two sign-in methods:**
  - **Magic-link email** via custom Email provider that calls `lib/email.ts → sendMagicLink`. With `RESEND_API_KEY` set, real Resend send. Without it, **dev fallback prints the link to the server console** with a clear "📧 DEV MAGIC LINK" banner.
  - **SMS code** via Twilio Verify, two-step. `POST /api/auth/sms/start` triggers the send (or logs `📱 DEV SMS CODE` with code `123456` when Twilio creds are missing). `signIn("sms", { phone, code })` runs through a Credentials provider whose `authorize` calls `checkSmsCode` and looks up the existing user. SMS sign-in is **invitation-only** — no account auto-creation.
- **`/sign-in` page** with two-tab client island. Email tab: single email input. SMS tab: phone → OTP step. Friendly error states. Branded with parish wordmark.
- **`middleware.ts`** uses the slim auth config to gate `/admin/*` and redirect to `/sign-in?callbackUrl=…`. Already-signed-in users hitting `/sign-in` get bounced to `/admin`.
- **Admin shell** at `app/(admin)/layout.tsx`: sticky navy topbar with parish brand + signed-in user + sign-out (Server Action), left rail with Content / Settings groupings, role-aware (`ministry_lead` only sees Ministries items).
- **`/admin` dashboard** — content-type tiles with live row counts; pending-edits banner appears when `ministry_edits.status = 'pending'` rows exist.
- **Events editor (canonical pattern):**
  - `/admin/events` list with All / Drafts / Published / Archived tabs and status pill, badge counts, "View on site →" deep links.
  - `/admin/events/new` and `/admin/events/[id]` share `EventForm.tsx` — RHF-free server-form using a Server Action; same Zod schema (`lib/validators/events.ts`) the public API will use in Step 6.
  - Server Actions in `_actions.ts`: `createEventAction`, `updateEventAction`, `setEventStatusAction` (publish/unpublish), `deleteEventAndRedirect` (soft delete via `archived` status). All call `revalidateTag("events")` so public-site Server Components flip on the next request.
  - Role gate: `admin` and `editor` can write; `ministry_lead` is forbidden at action level.
- **`AUTH_SECRET`** generated locally and in `.env.local` (gitignored). Matthew will set the same on Vercel for production. Fresh value: `openssl rand -base64 32`.

### Step 4 · Wave B done

All other content editors are live, each cloning the events pattern. Build green, every route 200 with auth, seeded data visible in every list view. The shared form-field atom lives in `components/admin/AdminField.tsx`.

- **`/admin/staff`** — list (All / Active / Inactive tabs) + new/edit form. Slug, name, role, email, bio (markdown), order priority, isActive. Photo upload deferred to Step 5. Admin-only mutations (per `backend.html §07` roles).
- **`/admin/seasonal-banners`** — list shows Live / Scheduled / Past / Inactive state computed from the date window + isActive flag. Editor: title, subtitle, ctaLabel, ctaUrl, startsAt, endsAt, isActive. Photo upload Step 5.
- **`/admin/ministries`** — full editor with status tabs, lead-staff dropdown sourced from `staff` rows, category enum, audiences/matchmakerTags as comma-separated arrays, accepting-new toggle, ordering priority, publish/unpublish actions.
- **`/admin/mass-times`** — weekly recurring rows and one-off override rows in one editor. A "Row type" radio toggles which fields show: weekly = day-of-week select; override = date + override-kind. Time, kind, label, presider (from staff), liveStreamUrl, notes, isActive. List has Weekly / One-off tabs.
- **`/admin/bulletins`** — read-only list with a "Bulletin uploads ship in Step 5" callout. Schema requires a real PDF in Vercel Blob (NOT NULL FK to `blob_assets`); editor unblocked once Step 5 lands.
- **`/admin/settings`** — singleton form: contactEmail, contactPhone, address (street/city/state/zip jsonb), social links (facebook/youtube/instagram), welcomeFormRecipients (comma-separated), footerCopy, densityScale. Admin-only.
- **`/admin/settings/giving`** — singleton form for the Touchpoint URLs jsonb: primaryUrl + recurringUrl + repeatable designations + repeatable seasonal campaigns with date windows. Add/remove rows in client state; submitted to a Server Action that decodes the bracket-indexed FormData entries (`designations[0].label`, etc.).
- **Validators** in `lib/validators/{events,staff,ministries,mass-times,seasonal-banners,site-settings}.ts` — single source of truth for create/update shapes. Step 6's public API will consume the same Zod schemas.
- All Server Actions call `revalidateTag(<content-type>)` so public-site Server Components flip on the next request.

### Step 4 · Wave C done

- **`/admin/users`** — admin-only. List with email / phone / role / verified state / created. Invite form (collapsible) supports email + name + phone + role + ministry. Inline `RoleSelector` for changing role and ministry scope per row; can't demote yourself. Validators in `lib/validators/users.ts` enforce ministry-lead → ministryId pairing.
- **`/admin/account`** — self-service for any signed-in user. Update name, phone (E.164), preferred auth method. Read-only display of email + role. "Sign out of this device" works. **"Sign me out everywhere"** is deferred (post-launch ticket — needs a `session_version` column on users to invalidate JWTs en masse).
- **`/admin/approvals`** — admin-only queue. Pending / All filter. Each pending edit shows a side-by-side diff (current vs. proposed) per changed field, an Approve button (applies the proposed jsonb to the ministry + revalidateTag), and a Reject button with a note textarea (sent back to the lead). Approval is transactional.
- **`/admin/edit-my-ministry`** — ministry-lead-only flow, hard-gated by `ENABLE_MINISTRY_SELF_SERVICE` (false at launch → returns 404). Single edit form scoped to `users.ministryId` with the controlled blocks from `backend.html §07`: tagline / description / cadence / contact email / accepting-new toggle / up to 5 FAQ Q&A pairs. Submitting creates a `ministry_edits` row with `status: pending`; doesn't touch the live ministry.
- **Validators** added: `lib/validators/{account,users,ministry-edits}.ts`.
- Schema refinement: `MinistryEditProposed` type loosened to allow `string | null` for nullable fields so empty submissions round-trip cleanly.
- **Deactivate** as a first-class concept is post-launch — for now an admin can change someone's role to limit access. Hard delete via Drizzle Studio.

### Step 4 · Wave D done — Matchmaker + public /ministries

The Ministry Matchmaker quiz, the public `/ministries` listing, and the
`/ministries/[slug]` detail page are all live. **Step 4 is closed.**

- **Schema:** added `matchmaker` jsonb to `site_settings` (migration `0001_flashy_darkstar.sql`). New TS types `MatchmakerManifest`, `MatchmakerQuestion`, `MatchmakerAnswer`. Default manifest seeded — 3 questions × 4 answers, tags tuned to the 8 dev-seeded ministries' `matchmakerTags` so the quiz returns meaningful results out of the box.
- **`POST /api/matchmaker`** — Server-side scoring. Reads the manifest + all published ministries, intersects each ministry's `matchmakerTags` with the user's tag bag (collected from chosen answers + manifest fallback tags), returns top 5 sorted by score then `orderingPriority`. If nothing scored above zero, returns the first 5 by priority + `matched: false` so the UX never bottoms out. Smoke-tested: `young+music+some` → Parish Choir + Youth Ministry top; `family+service+lots` → St. Vincent + Knights + Mothers' Group top.
- **Matchmaker client island** at `components/ministries/Matchmaker.tsx` — trigger button + modal wizard. Esc closes; body scroll locks while open; results render as ministry cards linking to `/ministries/[slug]`. Reusable on homepage and `/ministries`. Disabled state when manifest is empty.
- **`/ministries`** — interior hero, big navy "Open the matchmaker" CTA section, category filter chips (URL-synced via searchParams, computed from tags actually present in published ministries), grid of all published ministries.
- **`/ministries/[slug]`** — detail page. Hero with breadcrumbs, category eyebrow, audiences chips, Get-involved mailto: CTA. Body + sidebar layout: description (plain pre-wrapped text for v1; full markdown rendering pairs with bulletin viewer in Step 5 follow-ups), meeting cadence, lead staff card via `leftJoin`, contact email, accepting-new state.
- **`/admin/matchmaker`** — admin-only editor. Repeatable questions with id + prompt + answers; each answer has id + label + sublabel + tags. Surfaces the union of `matchmakerTags` actually used by published ministries so admins pick tags that actually score. Validators in `lib/validators/matchmaker.ts` enforce id format and uniqueness. Server Action upserts the singleton + revalidates `site-settings`.
- **Homepage** — replaced the placeholder "Ministry matchmaker" link with the real Matchmaker trigger; clicking opens the modal in-place.
- **Admin rail** — added "Matchmaker" under Settings (admin-only).
- Build gates green: typecheck, lint, build (33 routes total).

### Things still queued for the public /ministries page (post-launch polish)

- Real markdown rendering for the description (currently pre-wrapped plain text).
- Full-text search across ministries — deferred per `backend.html §17`.

---

## ✅ Shipped — Step 5 · Wave A: upload + CDN foundation

The Vercel Blob client-upload flow is wired end-to-end and Events is the canonical editor consuming it. Real photos render through `next/image` on the public site wherever a `photoBlobKey` is set; everything else gracefully falls back to the placeholder treatment. Other editors (ministries, staff, seasonal-banners, bulletins) get the same `<PhotoUploader>` swap in Wave B.

- **Decision: Path B — apex with `/cdn/` rewrite (or none for v1).** No subdomain, no DNS work to launch. We render Blob assets directly from `*.public.blob.vercel-storage.com` (whitelisted in `images.remotePatterns`). To brand asset URLs as `sainthelen.org/cdn/...`, set `BLOB_STORE_HOST` env var and the rewrite kicks in — `lib/blob.ts → resolveAssetUrl` switches automatically.
- **`POST /api/admin/upload`** uses `handleUpload` from `@vercel/blob/client` to mint a client-upload token. Auth-gated — any signed-in user. Allowlists `image/jpeg|png|webp|avif` (or `application/pdf` when the pathname ends `.pdf`). `addRandomSuffix: true` so concurrent uploads don't collide. Cache-control 30 days at the Blob origin.
- **`POST /api/admin/upload/complete`** records the `blob_assets` row from the client's reported metadata + dimensions (read client-side via `createImageBitmap` — no need to refetch bytes server-side). Uses the Blob `pathname` as the stable key. Returns `{ key }`.
- **`PhotoUploader` client island** (`components/admin/PhotoUploader.tsx`) — drop zone, preview, progress, alt text. Renders the existing photo when editing a row that already has one. Hidden form input carries the resulting key into the parent form's submit.
- **Events editor wired.** `EventForm` accepts a `photoPreviewUrl` prop (already-resolved by the [id]/page Server Component via `assetUrl()`). The "Photo upload ships in Step 5" callout is replaced with the real `PhotoUploader`. Server Action persists `photoBlobKey` alongside the rest of the row.
- **`PhotoPlaceholder` evolved.** New optional `imageUrl` + `imageAlt` props. When set, it renders `next/image` at the slot's aspect ratio with proper `sizes` for responsive serving. Otherwise it's the same placeholder treatment with the photo brief.
- **Public side rendering real photos** wherever `photoBlobKey` is set: homepage spotlight ministries + featured events, `/ministries` grid, `/ministries/[slug]` hero. Batch-resolved keys → URLs in one DB roundtrip via `resolveKeys()`.
- **Schema + validators**: `EventCreateSchema` / `EventUpdateSchema` accept `photoBlobKey`. `lib/validators/blob.ts` provides `UploadCompleteSchema` + allowlists.
- Build gates green — typecheck, lint, build (35 routes total). Smoke: upload endpoints 401 unauth, public pages still 200, events admin 307→sign-in.

### Step 5 · Wave B done — uploads everywhere + bulletins

- **PhotoUploader wired in all editors:** events ✅ (Wave A), ministries ✅, staff ✅, seasonal banners ✅. Each has the same pattern — Server Action persists `photoBlobKey`, edit page resolves the preview URL via `assetUrl()` and passes it through to the form.
- **Bulletins editor live.** `/admin/bulletins/new` and `/admin/bulletins/[id]` use `BulletinForm` with PhotoUploader (PDF accept). The uploader detects `application/pdf` and shows a filename chip instead of an image preview (no alt text needed for PDFs). Bulletins auto-publish on create. Duplicate-week-of inserts are blocked by the unique constraint with a friendly error.
- **Public `/bulletin` archive** with a modal viewer. Server Component fetches the published bulletin list + resolves PDF URLs in batch. Client island (`BulletinList.tsx`) handles the modal: iframe of the PDF, "Open in new tab" + "Download" buttons in the header, Esc to close, deep-link via URL hash (`/bulletin#2026-04-27` opens that bulletin directly).

### Step 5 — deliberately deferred (not blockers)

- **`/admin/media` library** — list/search/delete `blob_assets` rows. Drizzle Studio works for now if cleanup is needed.
- **`BLOB_STORE_HOST` rewrite to `sainthelen.org/cdn/...`** — flip the env var anytime to brand asset URLs. Currently they serve from `*.public.blob.vercel-storage.com`.
- **PDF thumbnails** — spec mentions sharp generating thumbs; deferred since browser-native PDF rendering in the modal works fine for v1.

---

## ✅ Shipped — Step 6 · Public API routes

The public-facing endpoints from `backend.html §05` that drive forms and external embeds.

- **`POST /api/welcome`** — wires the Plan-Your-Visit form on `/im-new` to a real Resend send. Reads `siteSettings.welcomeFormRecipients` for the to: list. Reply-To set to the visitor's email so a parish staffer can hit Reply directly. Rate-limited per IP (5 / hour, in-memory). Falls back to console log when `RESEND_API_KEY` is missing — same dev-mode pattern as magic links. The welcome form's `onSubmit` no longer logs; it actually sends.
- **`GET /api/readings`** — Edge runtime USCCB proxy with daily cache. Returns `{ date, source, readings }` where `readings` is a best-effort regex scrape of the four lectionary sections (First Reading / Psalm / Reading 2 / Gospel) with citation + preview text. If USCCB's markup doesn't match (current state), `readings` is null and consumers fall back to the outbound link.
- **`GET /api/mass-times`** — Public JSON of the weekly schedule. The same data `/mass` renders, just shaped for external consumers (any future widget, embed, or integration). Cached 5 min at the edge.
- **Shared `lib/readings.ts`** so `/mass` page calls the scrape directly server-side without a self-HTTP roundtrip.
- **`lib/email.ts → sendTransactional`** — generic Resend sender for any future transactional email. Same console-log dev fallback.
- **`/mass` readings card** now renders the inline citations when scrape succeeds; falls back gracefully otherwise. Outbound link is now to the actual day's USCCB URL, not the homepage.

### Step 6 — deliberately deferred

- **`POST /api/prayer-request`** — same shape as welcome, different recipients. Defer until `/prayer-request` page exists (no consumer yet).
- **`POST /api/revalidate`** — admin-triggered tag revalidation. Deferred because Server Actions already call `revalidateTag` in-process; the manual trigger is mainly useful when you want to bust cache without an admin write.
- **Polish: USCCB scraper accuracy** — current regex returns null on the live page. The fallback works, but inline citations would be nicer. A polish ticket; needs a fresh look at USCCB's HTML to update the selectors.

### Step 5 · Upload + CDN
- Client-upload flow per `backend.html §08`.
- `next.config` rewrite for `/cdn/:path*` → Vercel Blob origin.
- DNS handoff note for `cdn.sainthelen.org` CNAME.
- **Blocked by:** Blob store created, DNS access.

### Step 6 · Public API routes
- `/api/welcome`, `/api/prayer-request`, `/api/matchmaker`, `/api/readings` (Edge), `/api/mass-times`, `/api/revalidate`.

### Step 7 · Backups + staging
- Weekly Vercel Cron `pg_dump` → Blob, 12-week retention, monthly off-platform B2 copy.
- `staging` branch + `staging.sainthelen.org` deployment + dedicated Neon branch.
- First restore drill before launch.

### Step 8 · Integrations
- Resend domain on `send.sainthelen.org` (SPF / DKIM / DMARC).
- Twilio Verify service + per-user-per-hour cap.
- Fathom analytics, production only.
- **Subsplash livestream embed** — slot waiting for the widget code from Matthew.

---

## ❓ Open questions / decisions to revisit

| Topic | Status | Notes |
|---|---|---|
| Bulletin: modal vs. full page | **Pending** | Claude recommended full canonical pages with optional homepage quick-view modal. Surface again before building Step 3 bulletin work. |
| Subsplash widget code | **Awaiting Matthew** | Needed for `(site)/mass` and the homepage livestream slot. |
| Real photography | **Awaiting shoot** | Three scenes per `design-notes.html §02`. Placeholders ship now. |
| 301 map from 2.0 URLs | **Pre-launch** | Drafted with parish staff before DNS flip. Goes in `middleware.ts`. |

## ✅ Resolved decisions (2026-04-25 kickoff)

- **Day-1 admin:** `mboyle@sainthelen.org`. (Matthew's `matthew@adventii.com` is the dev address, not the seeded user.)
- **Livestream provider:** Subsplash. Matthew will supply the embed widget.
- **Matchmaker manifest editor:** form-based v1 inside the custom admin. Visual logic-tree editor explicitly deferred.
- **Spanish multilingual:** deferred indefinitely. Don't add `locale` columns.
- **Stack version:** Next.js 15.x latest (15.5.15 at time of writing). **Never Next 16.**

---

## ✅ Shipped — Wave 9 polish

Closed in one batch. Build green (41 routes). Smoke checklist below carries forward — the contrast / mass-times / ministry-page changes will be visible after redeploy.

- **Contrast audit + fixes.** Admin topbar: parish wordmark uses one consistent gold, env tag is now a pill (white-on-white-with-bg-tint passes AA), View site / user name / sign-out border opacities all bumped to full white or white/40+ where appropriate. Public Header nav items at full white with gold hover (was white/85). Footer links full white with gold accent on column titles + hover.
- **"Lede" → "Summary"** on the events editor label. Schema column stays `lede` (no migration); only user-facing copy changed. The `sh-lede` CSS class is just a typographic token — kept.
- **Public ministry pages stripped.** Removed audiences chips, contact email block, lead-staff sidebar card. Only the description + meeting cadence + accepting-new state + "All ministries" link remain on the public side. Internal admin still uses every field. The proper join / inquire / volunteer flow lands in Wave 11.
- **Mass times simplified.** Public render shows just **time + Sunday/Daily/Vigil** + a **Livestream pill** when applicable. Day picker presider line gone. Bottom weekly schedule columns now read **Saturday Vigil / Sunday / Daily Mass (Mon–Sat)** matching the real schedule. Seed rewritten: Daily Mon–Sat 9 AM (livestreamed), Saturday Vigil 5 PM, Sunday 8 / 10 AM (livestreamed) / 12 / 6 PM. Schema columns (label, presider) stay — just unused on the public side now.
- **Taxonomies live.** Added `taxonomies` jsonb to `site_settings` (migration `0002_aberrant_vanisher`) holding `eventCategories`, `eventAudiences`, `ministryAudiences`. Defaults seeded. New admin route `/admin/settings/taxonomies` with a `ListEditor` (chip-based add/remove). New `TagPicker` chip component; EventForm uses it for audiences + categories, MinistryForm for audiences. Comma-separated free text is gone. `/events` filter sidebar reads from taxonomies via the Server Component (no more `lib/events-filters.ts` constants — module deleted).
- **`/admin/media` library.** Lists every `blob_assets` row with previews (PDF gets a doc icon), search by key / alt / caption, delete-with-confirm. Delete bubbles a friendly error when an asset is still referenced by an editor (Postgres FK), rather than silent failure.

### Step 7 status

⏸️ **Deferred indefinitely** per Matthew. Backups + B2 + staging branch revisit before launch.

---

## ✅ Shipped — Wave 10 rich text

TipTap drives every long-form description in the admin. Output is sanitized HTML stored as plain TEXT in the existing schema columns (events.body, ministries.description, staff.bio) — **no migration needed.** Existing rows that are plain text without HTML tags pass through the sanitizer unchanged and render fine.

- **`components/admin/RichTextEditor.tsx`** — TipTap React, StarterKit + Link + Image + Placeholder. Toolbar covers bold / italic / strike / inline code / H2-H3 / lists / blockquote / hr / link / image. Hidden form input carries the HTML so the editor round-trips through standard FormData submits — works inside Server-Action forms with no client-side resolver.
- **Image insert** reuses `/api/admin/upload` + `/api/admin/upload/complete` so every embedded image is a real `blob_assets` row. The resulting `<img>` is stamped with `data-blob-key` for future orphan cleanup.
- **`components/site/RichTextRenderer.tsx`** — Server Component that sanitizes at render time and emits `dangerouslySetInnerHTML`. Sanitization on read (not write) keeps stored content lossless, so we can tighten or relax the allowlist later without a content migration.
- **`lib/sanitize.ts`** — pure-JS allowlist via `sanitize-html` (swapped from `isomorphic-dompurify` because Turbopack choked on jsdom CSS bundling). Tags: `p / br / hr / strong / b / em / i / u / s / code / blockquote / h2 / h3 / h4 / ul / ol / li / a / img`. Forces `target="_blank" rel="noopener noreferrer"` on every anchor. Schemes restricted to `http / https / mailto / tel`. Also exports `htmlToPlainText()` for previews + meta descriptions.
- **`sh-prose` styles** in `globals.css` — typography for rendered output (headings, lists, code, blockquote, anchors, hr, inline images). Public site renders cleanly without an extra dependency.
- Wired into `EventForm.body`, `MinistryForm.description`, `StaffForm.bio`. `/ministries/[slug]` renders descriptions through `RichTextRenderer` (was `whitespace-pre-line`).

Build green — 41 routes. Sanitizer covers Edge + Node runtimes.

## 🛑 Paused — end-to-end testing in progress

Build paused after Step 6. Step 7 deferred. Step 8 (Fathom + Subsplash) queued. Matthew is verifying everything end-to-end before we keep going.

### Test checklist (work top-down)

**0 · Vercel env vars + redeploy**
- [ ] Set in Vercel → Project Settings → Environment Variables → Production: `AUTH_SECRET` (fresh one — `openssl rand -base64 32`), `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_ENABLE_GIVE_FAB=true`, `NEXT_PUBLIC_ENABLE_LIVESTREAM=true`, `NEXT_PUBLIC_ENABLE_A11Y_WIDGET=true`, `ENABLE_MINISTRY_SELF_SERVICE=false`
- [ ] Deployments → latest → ⋯ → **Redeploy** (env-var changes don't apply retroactively)

**1 · Public site loads**
- [ ] `/` — homepage hero, "This Sunday" mass peek, ministries spotlight, featured events, bulletin block, support CTA
- [ ] `/im-new` — three steps + welcome form
- [ ] `/mass` — day picker (today is selected), readings card (citations or USCCB fallback), weekly schedule
- [ ] `/events` — featured event + filtered list, try `?audience=families`
- [ ] `/ministries` — all 8 ministries, category filter, "Open the matchmaker" button
- [ ] `/ministries/choir` — full detail page with sidebar
- [ ] `/bulletin` — empty state ("No bulletins yet")

**2 · Matchmaker quiz**
- [ ] Click "Open the matchmaker" on `/ministries` (or homepage)
- [ ] Walk through 3 questions, submit
- [ ] Top-5 ministries should appear with score badges; `family + service + lots` should put St. Vincent + Knights at top

**3 · Welcome form** (real email send)
- [ ] Submit `/im-new` welcome form with your real email
- [ ] Should land in `mboyle@sainthelen.org` inbox (per `welcomeFormRecipients` setting)
- [ ] Reply-To should be your email so a parish staffer can hit Reply directly

**4 · Sign-in — email magic link**
- [ ] Visit `/admin` → bounces to `/sign-in`
- [ ] Email tab → enter `mboyle@sainthelen.org` → "Send the link"
- [ ] Magic link arrives via Resend (from `no-reply@send.sainthelen.org`)
- [ ] Click → land in `/admin` dashboard

**5 · Sign-in — SMS**
- [ ] Sign out
- [ ] SMS tab → enter `9084038480` (plain 10 digits)
- [ ] Receive 6-digit code from Twilio
- [ ] Enter code → land in `/admin`

**6 · Admin walk-through** (signed in as admin)
- [ ] Dashboard tile counts match seed (8 ministries, 4 staff, 5 events, etc.)
- [ ] `/admin/events` list renders 5 seeded events with status pills
- [ ] Edit Harvest Fest → drop an image → save → check `/` (Featured Events) shows the photo
- [ ] `/admin/ministries` → edit Parish Choir → upload a photo → save → check `/ministries/choir` and homepage spotlight
- [ ] `/admin/staff` → upload a headshot → save
- [ ] `/admin/seasonal-banners` → create a banner with current dates → check homepage shows it
- [ ] `/admin/bulletins/new` → upload a real PDF for next Sunday → check `/bulletin` shows it → click row → modal opens with PDF
- [ ] `/admin/mass-times` → flip a row's livestream URL → save
- [ ] `/admin/settings` → tweak footer copy → check public site footer
- [ ] `/admin/settings/giving` → put your Touchpoint URLs in (when ready)
- [ ] `/admin/matchmaker` → tweak a question → save → re-run the public quiz, verify the change shows

**7 · Users + roles**
- [ ] `/admin/users` → invite a test address with role `editor`
- [ ] Sign out → sign in as the new user → verify limited admin access (no Site Settings, no Users)
- [ ] Sign back in as admin → change their role → verify takes effect

**8 · Mobile**
- [ ] Test homepage on a phone (or DevTools mobile preview at 390 px)
- [ ] Give FAB should appear after scrolling 400 px

### Known things that are expected NOT to work

- USCCB scraper returns null right now → the readings card shows the outbound link instead of inline citations. This is graceful degradation, not a bug.
- `/give` and `/contact` routes don't exist yet — links land on the branded `/(site)` 404. Defer until pre-launch polish.
- `/events/[slug]` detail pages don't exist yet — clicking an event card from the public list lands on the 404. Same.
- Subsplash livestream slot on `/mass` shows "Subsplash embed lands in Step 8 — Matthew will supply the widget."
- Bulletins are empty until you upload one in admin.
