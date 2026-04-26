# Saint Helen 3.0 — Build Status

> **Read this first, every session.** This is the running log of what's shipped, what's in flight, what's queued, and what's broken. It pairs with `CLAUDE.md` (rules) and `/design-ref/` (specs). Update it after every meaningful step.

Last updated: **2026-04-27**

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
| 11 | Per-ministry forms + leads dashboard | ✅ Done (Waves 11.0–11.7.1 — multi-lead, custom form fields, magic-link actions) |
| 11.5 | Frosted-pill header + video hero | ✅ Done |
| 11.6 | Site-wide CSS layering + on-dark variants | ✅ Done |
| 12 | Blog + megamenu + nav editor | ✅ Done (12.A nav editor, 12.B blog) |
| 13 | Sections + embed allowlist + matchmaker skip-rules | 🟡 Mostly done — sections + embeds shipped; matchmaker rules remain |
| 13.E | Recurring events + custom CTA + event detail page | ✅ Done |
| 13.F | Vanity-URL redirects (admin-managed) | ✅ Done |
| 13.G | Polymorphic page_sections + inline preview + Formation pages | ✅ Done |
| 13.H | Editable logo + footer copy + bottom bar | ✅ Done |
| 13.I | Hamburger menu + mobile drawer | ✅ Done |
| 13.J | Announcements (slide-in + modal popup) | ✅ Done |
| 14 | Homepage CMS — hero settings + sections + 3 specialized blocks | ✅ Done (14.A–14.H — covers podcast, bento, overlay cards) |
| 14.G | Media library picker on every upload surface | ✅ Done |
| 14.I | Bento icons + display headings + pastor_welcome block | ✅ Done |
| 14.J | Favicon CMS + last-edited-by + content-editor playbook + logo-upload fix | ✅ Done |

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

## ✅ Shipped — Wave 11 inquiries pipeline

Public visitors can submit Join / Inquire / Volunteer requests on every published ministry page; ministry leads + admins receive an email with one-click status buttons and manage the pipeline from `/admin/inquiries`. Migrated `users.ministry_id` → a many-to-many `ministry_leads` join so a person can lead any number of ministries (and vice versa).

- **Schema (migration 0003).** New tables: `ministry_leads (user_id, ministry_id, is_primary, added_at, added_by)`, `inquiries (id, ministry_id, kind, name, email, phone, message, custom_answers, status, reason_code, notes, assigned_to, created_at, updated_at)`, `inquiry_events (id, inquiry_id, user_id, via_token, kind, payload, at)`. Dropped `users.ministry_id` after data-copy. Added `ministries.inquiry_config` jsonb (per-ministry button toggles + labels). **Note:** the migration was applied to Neon during Wave 11 build — combined with the deploy of this commit, `users` schema and code re-align.
- **Auth.** `session.user.ministryIds[]` replaces `ministryId`. JWT hydrates from the join table on initial sign-in; admins re-sign-in to pick up new lead assignments (real-time refresh via `session_version` is post-launch).
- **Users & roles.** `/admin/users` invite + edit-role both take a multi-ministry chip picker; ministry-lead role enforced to require ≥1 ministry. Replace-set semantics on save.
- **Per-ministry self-service.** `/admin/my-ministries` lands ministry leads on a card list (or auto-redirects when they lead exactly one). `AdminRail` differentiates ministry-lead surface from admin/editor surface.
- **Public form.** `/ministries/[slug]` renders a "Get involved" section with the configured button row; clicking opens an inline form that POSTs to `/api/ministries/[slug]/inquire`. Rate-limited 5/hour/IP, validates with `InquirySubmitSchema`, inserts `inquiries` + `created` event, emails every lead of that ministry through Resend with HTML+text bodies + 3 magic-link action buttons + dashboard link.
- **Magic-link actions.** `lib/inquiry-tokens.ts` HMAC-signs `{iid, act, exp}` payloads with 24h TTL using `AUTH_SECRET`. `/inquiries/[token]` confirms intent on GET (Outlook safe-link prefetch resistant), applies on POST via Server Action — idempotent and timeline-logged with `via_token=true`.
- **Admin dashboard.** `/admin/inquiries` filters by status (default = open: new+contacted+stuck), ministry, and free-text search across name/email/message. `/admin/inquiries/[id]` shows the timeline (created → status changes → notes → assignments → magic-link clicks) plus status update, notes, and assignee picker. Authorization: admin/editor see everything; ministry leads see only their ministries.

## ✅ Shipped — Wave 11.5 visual polish

- **Frosted-pill header.** `<Header>` is a sticky pill at the top of every public page — `bg-navy/55 backdrop-blur-md` with rounded-full container. Inner nav links pick up subtle `hover:bg-white/10` chips. Reads on photo + cream + navy backgrounds equally.
- **Full-bleed video hero.** New `<HeroVideo>` client component drives the homepage hero. Reads `NEXT_PUBLIC_HERO_VIDEO_URL` (and `NEXT_PUBLIC_HERO_VIDEO_POSTER`) — autoplay/muted/loop/playsinline with navy-to-black gradient overlay. Falls back to poster-only when video URL unset, falls further back to a navy gradient when neither is set. Honors `prefers-reduced-motion` (motion-reduce hides the video, shows the poster). Hero copy restyled to white-on-dark with gold eyebrow accents. *Note: Wave 14.B replaced the env-var hero with admin-editable settings; env vars still work as fallback.*

Build green. SMS auth re-aligned with the new schema (no longer references the dropped `users.ministry_id`).

## ✅ Shipped — Wave 11.6 / 11.6.1 site-wide CSS layering

Root-cause fix for "h2 invisible on dark backgrounds." Tailwind 4 utilities sit in `@layer utilities`; anything outside any layer landed in the implicit anonymous layer that sits above utilities. Wrapped base element rules (body, h1-5, p, a) in `@layer base` and helper classes (.sh-display, .sh-prose, .form-input, etc.) in `@layer components`. `text-white` on dark sections now actually wins. Added `.sh-on-dark` defensive scope used on every dark public surface (Find your place, Support, Footer, all dark cards) to flip headings + body to white-on-dark by default. Header reshaped to absolute-over-hero → fixed-frosted-on-scroll per `kit.css §MASTHEAD`.

## ✅ Shipped — Wave 11.7 + 11.7.1 inquiry form builder

Per-ministry form is now fully customizable. Unified `inquiryConfig.fields[]` (replacing the half-built `customFields[]`) — discriminated union of `system` (name/email/phone/message; label-editable, hide-able for phone+message; name+email forced) and `custom` (text/textarea/select/radio/checkboxes with a per-block options sub-editor). Submissions still post `name/email/phone/message` plus `customAnswers` keyed by question label; checkbox answers join with " · " into a single string for the email + admin display.

## ✅ Shipped — Wave 12 navigation + blog

- **12.A — Mega-menu + nav editor.** New `siteSettings.nav` jsonb (migration 0004) holds `NavManifest = { items: NavItem[] }`. Each item is either a plain link or a 3-column mega-menu with link sections + optional gradient feature card. Public Header reads the manifest and renders flyout panels per `kit.css §63-96` with hover-intent + Escape close. Admin editor at `/admin/settings/navigation` (admin-only) — add/remove/reorder up to 8 top-level items, attach mega-menu, configure 1-4 sections with up to 12 links each.
- **12.B — Blog.** New `posts` table (migration 0005). Two categories: `pastor` letters + `stewardship` updates. Admin CRUD at `/admin/posts` mirrors the events editor; public `/blog` index with category-chip filter + `/blog/[slug]` detail. Body via TipTap, sanitized on render.

## ✅ Shipped — Wave 13.E recurring events + custom CTA

Migration 0006 adds three columns: `recurrence` jsonb (discriminated union — weekly + interval + multi-weekday picker, OR "nth weekday of the month" with `nth: 1|2|3|4|5|"last"`), `exceptionDates` jsonb (ISO timestamp array for cancellations / holiday weeks), `registerCtaLabel` text (falls back to "Sign Up" when null). New `lib/recurrence.ts`: pure helpers `expandEvent`, `expandEvents`, `summarizeRecurrence`. Public `/events` expands instances over a 6-month horizon and groups by occurrence date. Admin EventForm gains a RecurrenceEditor block. Detail page `/events/[slug]` ships in 13.E.4 — hero snaps to next occurrence, sidebar shows recurrence summary, "Upcoming dates" panel lists next 12.

## ✅ Shipped — Wave 13.F vanity-URL redirects

Admin-managed redirects in `siteSettings.redirects` jsonb (migration 0007). `/admin/settings/redirects` editor: add `from /youth → to /ministries/youth-ministry`, mark permanent (308) vs. temporary (307 default), unique-from + no-loop validation. Middleware looks up the manifest via Next's data-cached fetch (`/api/redirects` route, Node runtime, `unstable_cache` backed by the `redirects` tag). Skipped on `/admin/*`, `/api/*`, and Next internals.

## ✅ Shipped — Wave 13.A–13.D ministry sections + 13 blocks

Block-based content rendered below the description on `/ministries/[slug]`. New `ministry_sections` table (migration 0008, later renamed to `page_sections` in 0009 — see Wave 13.G). Discriminated-union `MinistrySectionPayload` covers the full v1 menu:

> heading · rich text · image · image+text · image gallery · link list · button group · video (MP4/HLS via Bunny — hls.js dynamic-imported only on .m3u8) · embed (allowlist: YouTube, Vimeo, Bunny, Google Forms, Eventbrite, SignUpGenius, Touchpoint, generic iframe) · card grid · staff card (references staff records) · callout banner · columns (recursive, one nesting level)

Each block has an optional shared header (heading, subheading, anchor id). Image-bearing blocks fan out via `lib/section-resolve.ts` — one DB roundtrip resolves every blob URL + every referenced staff row. Single admin editor at `/admin/ministries/[id]/sections`; replace-set save semantics. Embed editor parses pasted URLs against the allowlist; video block auto-detects MP4/HLS/YouTube/Vimeo. RichTextEditor gained an optional `onChange` callback so controlled-state consumers (this editor) don't need a hidden form input.

## ✅ Shipped — Wave 13.G polymorphic refactor + preview + formation

Three pieces:

1. **Polymorphic refactor** (migration 0009): renamed `ministry_sections` → `page_sections` with a `parent_kind` discriminator (`ministry` | `formation` | `homepage` after 14.A). Dropped the FK to ministries — `parent_id` is now polymorphic; app code handles cascade on parent delete. `lib/server/page-sections-actions.ts` holds the shared replace-set saver.
2. **Inline preview toggle.** Each section editor row gets an Edit/Preview switch + a "Preview all" master toggle at the top. `PreviewBlock` is a parallel client renderer (plain `<img>` instead of `next/image`, sanitized HTML via `dangerouslySetInnerHTML` for rich text + image+text, embedded VideoBlock + iframe markup for video/embed, gradient placeholders for empty blocks).
3. **Formation pages.** New `formation_pages` table (migration 0010) — slug, name, summary, description, category (kids/youth/adults/families), audiences, photoBlobKey, contactEmail, leadStaffId. Admin CRUD at `/admin/formation` plus `/admin/formation/[id]/sections` reusing the same SectionEditor with `parent_kind="formation"`. Public `/formation` index with category-chip filter + `/formation/[slug]` detail.

## ✅ Shipped — Wave 13.H–13.J brand + announcements

- **13.H — Logo + footer.** Migration 0011 adds `siteSettings.logoBlobKey` + `logoAlt` + `bottomBarHtml`. Header swaps the "Saint Helen" wordmark for the uploaded logo (max-height 36 px, also used in mobile drawer header). Footer accepts `footerCopy` (multi-line paragraph) + `bottomBarHtml` (sanitized HTML thin strip). New "Branding" section in `/admin/settings`.
- **13.I — Hamburger + mobile.** Right-side slide-in drawer with body-scroll lock, Escape close, click-outside close, route-change auto-close. All nav items + flattened mega-menu sections. Logo + Give CTA persist in the drawer header.
- **13.J — Announcements.** Migration 0012 — slide-in (bottom-right) and full-screen modal popups. Schema: `kind`, `priority`, `startsAt/endsAt` window, ribbon/title/body/image/dateRows/CTA, `showDelaySeconds`, `dismissDays` (localStorage TTL keyed by announcement id), accent (navy/rust/gold). Tailwind-based, no `!important`. Admin editor at `/admin/settings/announcements`. Public layout picks the highest-priority active announcement and renders the slide-in or modal based on `kind`.

## ✅ Shipped — Wave 14 homepage CMS

Hero stays structurally hardcoded (full-bleed video, fixed-top placement) but its **content** is admin-editable:

- **14.B** (migration 0013) — `siteSettings.homepageHero` jsonb. Editable: video URL, poster URL, eyebrow, title, lede, repeatable CTAs (0–6, label + URL + variant primary/secondary, reorderable), Mass-times peek (toggle + customize eyebrow / link label / link href; times themselves auto-pull from `mass_times`).
- **14.A** — Two new specialized blocks: `featured_ministries` (mode: spotlight | random | manual; count 1-8; tone default | navy; manual chip-pick; CTA) and `featured_events` (count 1-12; optional category filter; auto-expands recurring events). Embed allowlist gains Spotify + Apple Podcasts.
- **14.C** — `/admin/homepage` page combines `<HeroEditor>` + `<SectionEditor>` (parent_kind=homepage). Public `/(site)/page.tsx` refactored to read hero from settings + sections from page_sections — ~280 lines of hardcoded JSX replaced with CMS rows. Migration 0014 seeds the existing layout into `page_sections` so production stays identical-looking on deploy.
- **14.D** — Dedicated `podcast_episode` block: showLabel (eyebrow), header, description, URL (Spotify/Apple — provider auto-detected, embed iframe at correct height), optional subscribe CTA. Same commit relaxed image_text/image/image_gallery validators to allow empty `blobKey` during in-progress edits — public renderer hides image-only blocks with no image and collapses image+text to single-column when missing.
- **14.E** (migration 0015) — `card_grid.layout: "uniform" | "bento"`. Bento renders first 2 cards as large 16:9 feature cards + remaining cards as a compact 4-up tile row with alternating navy accents. Migration flips the seeded "How can we serve you today?" block to bento mode.
- **14.F** — Dropped `db.transaction(...)` in two server actions (`page-sections-actions.ts`, `approvals/_actions.ts`) — Neon HTTP driver doesn't support transactions. Refactored to sequential queries; failure mode is recoverable retry, not data corruption.
- **14.G — Media library picker.** Reusable `<MediaPickerModal>` + `lib/server/media-list.ts` (paginated keyset cursor on `uploadedAt`, search across key + alt + caption). Wired into `<PhotoUploader>` (used by every form's cover photo + the site logo), `<SectionImagePicker>` (every block-editor image slot), and `<RichTextEditor>` toolbar. WordPress-style "pick from library" everywhere — no more re-uploading the same file.
- **14.H — Card overlay style + per-card CTA.** `card_grid.cardStyle: "stacked" | "overlay"`. Overlay = full-bleed image + dark gradient + text/CTA on top. Applies to uniform-layout cards and bento heroes; bento tiles stay stacked. Per-card `ctaLabel` renders as a frosted pill on overlay cards or a small text-link on stacked.

Build green throughout. ~70+ routes. Migrations applied through 0015.

## ✅ Shipped — Wave 14.I — Bento icons + display headings + pastor block

- **Bento tile icons (208 curated lucide-react icons).** New `lib/icon-catalog.ts` indexes 208 hand-picked icons across faith, sacraments, community, family, formation, music, events, places, giving, hospitality, communication, nature, symbols. Searchable `IconPickerButton` (`components/admin/IconPicker.tsx`) modal — search by name/label/tag plus a group dropdown. `BentoTileCard` precedence: icon → image → placeholder arrow. Uniform card_grid cards keep their image-only flow. Stable IDs are the lucide PascalCase export name; unknown names render nothing (catalog can be pruned without breaking saved cards).
- **Display headings restored.** `SectionHeader` gained optional `eyebrow` + `align` (no migration — payload jsonb). `HeaderEl` in the public renderer + admin preview emit eyebrow + clamped serif title + rust rule + lede stack — restoring the original SectionHead treatment lost when Wave 14 migrated the homepage to CMS sections. Existing rows render unchanged because both new fields are optional.
- **`pastor_welcome` block kind (migration 0016).** Replaces the generic `image_text` stub. Optional video URL (mp4/HLS/YouTube/Vimeo, auto-detected) + pastor photo (used as poster when video set) + rich-text body + signature name + signature role + media-side toggle. The existing seeded row was promoted in place by an idempotent migration (only rewrites the unedited row).

## ✅ Shipped — Wave 14.J — Favicon + last-edited-by + playbook + logo-upload fix

- **Logo upload bug fixed.** `AdminField` wraps its child in `<label>` for accessibility, but `<label>` plus a hidden `<input type="file">` inside a media uploader (`PhotoUploader`) made the file picker silently swallow clicks. Settings now uses a sibling `MediaField` (plain `<div>`) for media inputs. Other forms already used `<div>` wrappers — this only affected the settings logo + the new favicon/apple-touch-icon fields.
- **Favicon + Apple touch icon CMS (migration 0017).** New columns on `site_settings`: `faviconBlobKey`, `appleTouchIconBlobKey`. Admin UI added under Branding. Root layout uses `generateMetadata()` to read the singleton + emit `<link rel="icon">` and `<link rel="apple-touch-icon">` from Blob URLs. Falls back gracefully when not set (browser uses `/favicon.ico` from `app/`). Apple icon falls back to favicon when not set.
- **Last-edited-by tracking (migration 0017).** Nullable `lastEditedBy uuid REFERENCES users(id)` + `lastEditedAt timestamp` on every content table: `staff`, `ministries`, `formation_pages`, `page_sections`, `inquiries`, `announcements`, `posts`, `events`, `mass_times`, `bulletins`, `seasonal_banners`, `site_settings`. New helper `lib/audit.ts → editorFields()` returns `{ lastEditedBy, lastEditedAt }` from the current session — spread into every server action's `.set()` / `.values()`. Wired across all 11 admin action files (events / ministries / posts / staff / bulletins / seasonal-banners / mass-times / formation / announcements / settings / page-sections). Surfaced on the events admin list as "by Name" under Updated; other content lists follow the same join pattern.
- **`CONTENT_EDITOR_GUIDE.md`.** Non-dev playbook at the repo root. Covers sign-in, dashboard tour, common tasks (add event, edit homepage, upload bulletin, customize nav, etc.), photo workflow, every block kind, publishing checklist, troubleshooting. Aimed at parish staff, not engineers.
- **Give-section CTA color fix.** `callout_banner` block's CTA anchor inherited the base anchor color (rust) on navy/warm tones because `.sh-on-dark` flips headings + p but not anchors. CTA now sets `text-white hover:text-white` explicitly on dark tones; `bg-navy text-white` on the gold tone for contrast.

Build green. Migrations applied through 0017. ~75 routes.

## 🛑 Paused — end-to-end testing in progress

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

- USCCB scraper returns null right now → the readings card shows the outbound link instead of inline citations. Graceful degradation, not a bug.
- `/give` and `/contact` routes don't exist yet — links land on the branded `/(site)` 404. Defer until pre-launch polish.
- Subsplash livestream slot on `/mass` shows "Subsplash embed lands in Step 8 — Matthew will supply the widget."
- Bulletins are empty until you upload one in admin.
- `NEXT_PUBLIC_HERO_VIDEO_URL` env var path is still wired as a fallback for the homepage hero, but Wave 14.B made it admin-editable via `/admin/homepage`. Once you set the URL there, the env-var fallback never reads.

### Resolved (used to be on the broken list)

- ~~`/events/[slug]` detail pages~~ — built in Wave 13.E.4 with recurrence summary + upcoming-dates panel.
- ~~Homepage is hardcoded~~ — Wave 14 made it fully CMS-editable at `/admin/homepage`.

## What's left before launch

Ordered by what unblocks the most:

1. **Step 8 — External integrations** (queued). Fathom analytics + Subsplash livestream embed. Resend domain + Twilio Verify already wired; just env-var hookup remains.
2. **Pre-launch sitemap audit.** Memory note `project_pre_launch_sitemap_audit.md` — walk live sainthelen.org sitemap.xml, port content into the new CMS.
3. **Wave 13 matchmaker skip-when rules.** Resolved scope memory has this; not yet built. Less critical than launch-blocking items.
4. **Step 7 — Backups + staging branch.** Deferred indefinitely per Matthew; revisit before DNS flip.
5. **Mobile real-device testing.** Hamburger menu + touch interactions on real iPad / iPhone (DevTools mobile mode is OK for layout, not for touch).
6. **Eventually: side-by-side preview pane, drag-drop reordering, block presets** — see `project_future_upgrades.md` memory note.

---

## 📋 Roadmap — features still on the table

Captured here so the next session has a single source. Order is rough,
each is a separate Wave when picked up.

### Page creator (CMS pages with the block editor)

The block system is already polymorphic (`parent_kind: ministry | formation | homepage`) — adding `parent_kind="page"` is the smallest possible extension.

- New `pages` table: `id, slug, title, summary, status, seo fields, createdAt, updatedAt, lastEditedBy/At`.
- Admin: `/admin/pages` list + `/admin/pages/[id]` editor + `/admin/pages/[id]/sections` reusing `<SectionEditor>` verbatim.
- Public: `/p/[slug]` route (flat). Avoids collision with reserved top-level routes; nested paths can come later if needed.
- Estimate: ~1 day.

### SEO foundation (RankMath equivalent)

No off-the-shelf Next.js plugin matches RankMath; build from primitives.

- **Per-row SEO fields** on every public content type (events, ministries, formation_pages, posts, pages): `metaTitle`, `metaDescription`, `ogImageBlobKey`, `noindex`, `canonicalUrl`. Single migration adds them all.
- **`generateMetadata()`** in each `[slug]/page.tsx` reads those fields with sensible fallbacks (post.title → metaTitle, htmlToPlainText(body).slice(160) → metaDescription).
- **`app/sitemap.ts`** pulls all published rows from DB. **`app/robots.ts`** for robots.txt.
- **JSON-LD per content type:** Article (posts), Organization (already on root), BreadcrumbList, FAQPage where applicable. Event already done.
- **Admin SEO panel** per row: meta-title length meter (~60), description meter (~160), Google-result preview card, OG-image preview, sitemap-inclusion toggle. This is the "RankMath feel."
- **NOT realistic:** RankMath's content scoring (keyword density, readability score) — needs NLP heuristics, post-launch only.
- Estimate: ~3 days for foundations + admin panel.

### Auto-save + unsaved-changes guard

Long admin forms (events, ministries, page-sections) lose work on accidental tab close. Add `beforeunload` warning + opt-in 30-second auto-save to a `drafts` jsonb column on each row.

### Drag-and-drop reorder for page_sections

Listed in `project_future_upgrades.md`. Replace up/down arrow buttons with `@dnd-kit/sortable`. Section editor already passes ordered indices to the saver — purely UI swap.

### Image alt-text linter

Warn at admin-level when alt is empty before publish. a11y win, two-hour change.

### Scheduled publishing

`backend.html §17` deferred. Add `publishesAt` timestamp + a Vercel Cron handler that flips drafts to published when due. Useful for parish announcements.

### Audit log + soft-delete restore UI

Both deferred per `backend.html §17`. lastEditedBy is the partial answer. Full audit log = a `mutation_log` table writing every change. Soft-delete restore = surfacing archived rows with a "Restore" button.

### Bulk admin actions

Bulk archive / publish / delete on list pages. Quality-of-life polish.

### Custom 404 + 500 pages

Currently bare Next.js defaults. Add parish branding.

### Side-by-side public preview pane

For long pages, an iframe of the rendered public page next to the editor would close the loop on "preview before publish." Listed in `project_future_upgrades.md`.

### Docs gaps

- `/website/README.md` — quick local-setup doc for new devs.
- `CHANGELOG.md` — STATUS.md mixes shipped/in-progress; a public-facing changelog helps launch comms.
- Deployment runbook — what to do if a Neon migration fails, how to roll back a Vercel deploy, where logs live.
