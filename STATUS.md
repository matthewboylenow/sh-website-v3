# Saint Helen 3.0 — Build Status

> **Read this first, every session.** This is the running log of what's shipped, what's in flight, what's queued, and what's broken. It pairs with `CLAUDE.md` (rules) and `/design-ref/` (specs). Update it after every meaningful step.

Last updated: **2026-08-04**

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
| 13 | Sections + embed allowlist + matchmaker skip-rules | ✅ Done (13.K closed Wave 13) |
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
| 15 | Sacramental intake forms — funeral + baptism (PDF + email + admin) | ✅ Done |
| 16 | June reconciliation — 18 ministry bodies + 9 evergreen pages + standalone root URLs + redirects + inquiry fallback | ✅ Done |
| 17 | July staff ministry punch list (51 items) | ✅ Done |
| 18 | Legacy-URL reconciliation — 23 new CMS pages, redirect overhaul, **middleware redirect bug fixed** | ✅ Done |
| 18.1 | CMS pages moved from /p/<slug> to root /<slug> (Matthew: "no /p") | ✅ Done |
| 18.2 | WP backend port — 239 blog posts, 214 Redirection short links, intake recipients | ✅ Done |
| 18.3 | OCIA inquirer form (/ocia-form) + prayer requests (/prayers + API) | ✅ Done |
| 18.4 | Our Team → staff_card blocks + full wp-content media migration (82 assets) | ✅ Done |
| 19 | Test harness + CI + shared role predicates | ✅ Done (221 tests, GitHub Actions on push/PR) |
| 19.1 | Starter layouts on "+ New page" | ✅ Done (blank / simple / ministry landing / upcoming event) |
| 20.A | Answer engine — core logic, schema, 52 seed cards | ✅ Done (398 tests) |
| 20.B | Answer engine — API routes + public widget | ✅ Done (464 tests) |
| 20.C | Answer engine — homepage hero placement | ✅ Done (471 tests) |
| 20.D | Answer engine — admin screens + retention job | ✅ Done (486 tests) |
| 21 | Timezone — recurrence and formatting on the parish clock | ✅ Done (512 tests) |
| 21 | Pre-launch punch list | 🟡 Scoped — see `claude/v3-launch-scope.md` |

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

## ✅ Shipped — Wave 15 sacramental intake forms

Funeral + baptism intake forms ported from the legacy FluentForms pages
on the current sainthelen.org. Replaces the WordPress dependency with a
fully in-house pipeline that generates branded PDFs, attaches them to
the notification email, AND saves every submission to the database.

- **Schema** (migration 0022). New `form_submissions` table: `id`,
  `kind` (`funeral` | `baptism`), `payload` jsonb, `submitter_name`,
  `submitter_email`, `subject_name` (deceased / child), `subject_date`
  (Mass / baptism date), `pdf_blob_key` → `blob_assets.key`,
  `created_at`. Two new columns on `site_settings`:
  `funeral_form_recipients` + `baptism_form_recipients` (text[]),
  parallel to the existing `welcome_form_recipients`.
- **Validators** in `lib/validators/funeral.ts` +
  `lib/validators/baptism.ts`. Tight on required fields (filer
  identity, Mass date/time for funeral; child + parents + godparents
  for baptism), loose on the long-form prose fields. Reading + hymn
  options are validated as free strings — the music director sometimes
  accommodates one-offs.
- **Hardcoded option lists** in `lib/funeral-options.ts` — readings
  codes (OT-1..OT-9, NT-1..NT-19, Easter), six music slots with the
  standard Catholic funeral repertoire. Per-file comment marks these
  as edit-in-place. No DB editor in v1 (user choice).
- **PDF generation** with `@react-pdf/renderer`. `lib/pdf/intake.tsx`
  is the shared layout (navy header bar, gold eyebrow, alternating row
  tint, rust section rules, page x/y footer). Per-form section
  builders in `lib/pdf/funeral.ts` + `lib/pdf/baptism.ts` map the
  validated payload to a `PdfSection[]` shape — exported separately so
  the admin detail page can re-render the same structure as HTML
  without pulling react-pdf into the Server Component. Types live in
  `lib/pdf/intake-types.ts`; the heavy `renderIntakePdf` is dynamic-
  imported inside the renderXxxPdf wrappers.
- **Public routes** `/funerals` + `/baptism`. Match the legacy URL
  shape exactly so DNS-flip redirects are trivial. Funeral form has 11
  anchored sections with a sticky sidebar nav at desktop; conditional
  fields driven by `useForm.watch` (spouse block only if Married;
  readings dropdown only if family chooses; reader names only if Yes;
  Words-of-Remembrance person only if Yes). Baptism is a single column
  — child / mother / father / family / godmother / godfather. Form
  atoms in `components/forms/atoms.tsx`: `TextField`, `TextareaField`,
  `SelectField`, `RadioField`, `AddressBlock`, `FormSection`.
- **API routes** `/api/funerals` + `/api/baptism`. Rate-limited 3/hour
  per IP. Pattern: Zod-validate → render PDF buffer → `lib/intake-
  submission.ts` handles `put()` to Vercel Blob → insert `blob_assets`
  row → insert `form_submissions` row → call `sendTransactional` with
  the PDF attached + Blob URL in the email body. Dev-mode fallback
  (when `BLOB_READ_WRITE_TOKEN` is unset) still records the submission
  + logs the email, just without the Blob upload.
- **Email** picks up `lib/email.ts → sendTransactional` extended with
  an `attachments` array (Buffer-based; mapped to Resend's
  `content_type` API). Console-log dev fallback unchanged. Reply-To is
  the submitter's email so a parish staffer can hit Reply.
- **Admin recipient editor.** Two new comma-separated inputs in
  `/admin/settings → Forms & footer`, next to the existing welcome
  recipients. Wired through `SiteSettingsGeneralSchema` + the
  `updateSiteSettingsGeneralAction` server action.
- **Admin submissions dashboard** at `/admin/form-submissions`. List
  view: filter by form kind, free-text search across name / email /
  subject, sort by newest. Detail at `/admin/form-submissions/[id]`
  reuses the PDF section builders to render every answer in the same
  layout as the PDF — bonus: "Download PDF" button at top resolves
  via `assetUrl(pdfBlobKey)`. Admin + editor roles see it;
  ministry-lead role redirected to `/admin`.
- Build green throughout. Typecheck + lint + build all clean. ~77 routes.

### Known caveats

- **PDF fonts** use react-pdf's built-in Helvetica + Times for fast
  cold starts. If the parish wants Libre Baskerville / Libre Franklin
  in the PDF, register the fonts via `Font.register()` against the
  Google Fonts CDN URL — adds ~150ms to first render. Defer until
  someone asks.
- **Country dropdown** — dropped from both forms (the legacy form had
  249 options; this is a single NJ parish). USA is implicit.
- **Inquiry config** — none. These submit to email + DB; there's no
  status workflow ("scheduled / cancelled") because the parish staff
  manages those in their calendar, not in the website. Trivial to add
  a `status` column later if needed.

## ✅ Shipped — Wave 16 June reconciliation (2026-06-03)

Applied the reconciliation bundle (`sh-nextjs-reconciliation.zip`) — the
parallel WordPress audit's clean copy + URL plan + redirect manifests are
now the source of truth on the Next.js side. Build green throughout.
~90 routes; 12 new static prerenders for the standalone ministries.

- **Ministry content reconciliation (Step 1).** Ran the bundle's
  `import-reconciliation.ts` against 18 ministry slugs: adoration,
  ageless, basketball, catholic-families-connect,
  childrens-liturgy-of-the-word, christlife, contemplatives, cornerstone,
  eft, kids-corner, media-ministry, music, prayer-shawl, pre-cana,
  service-auction, sing-n-pray, twelve, youth-ministry. 18/18 updated;
  42 page_sections rows written. Closes the leaked-import-artifact bugs
  (ChristLife / Pre-Cana / Basketball editor instructions appearing as
  live copy) plus the legacy "Adult Activities" / "Sunday Experience" /
  scraped-footer placeholders. HAND_TEMPLATED ministries
  (mental-health-ministry, wedding-ministry) auto-skipped.
- **9 evergreen pages (Step 2).** New importer
  `import-reconciliation-pages.ts` upserts into the `pages` table from
  `pages-content/*.md` (YAML frontmatter + markdown body, same
  marked → sanitize-html → htmlToBlocks pipeline). 6 inserted, 3 updated
  (become-catholic, pastoral-council, prayers replaced their earlier
  admin-built versions with the bundle's audited copy). Live at
  `/p/<slug>`: our-team, pastoral-council, become-catholic,
  mass-intentions, prayers, podcast, spiritual-direction,
  privacy-policy, from-our-pastor.
- **About-nav rewired.** `update-nav-manifest.ts` updated to point the
  About mega at Our Team / Pastoral Council / Become Catholic / From
  Our Pastor (+ Contact Us). The earlier seasonal/campaign links (All
  In Report, Heritage Fund, Jubilee 2025) dropped from the nav —
  redirects handle the old URLs.
- **Footer Privacy Policy.** Default bottom-bar fallback now includes
  a Privacy Policy link pointing at `/p/privacy-policy`. Admin-edited
  `bottomBarHtml` still wins when set.
- **12 standalones at root (URL model).** Per the bundle's
  `redirects-nextjs.json`, the 12 standalones now render at root:
  `/adoration`, `/basketball`, `/called`, `/christlife`, `/grow`,
  `/lifelines`, `/music`, `/pre-cana`, `/vbs`, `/wwp`,
  `/young-adult-ministry`, `/youth-ministry`. Extracted the shared
  ministry-page renderer into `lib/ministry-route.tsx`
  (`renderMinistryPage(slug, opts)`, `buildMinistryMetadata`,
  `STANDALONE_SLUGS`). `/ministries/[slug]/page.tsx` reduced to a thin
  wrapper. Each of the 12 root routes is a 12-line file that delegates
  to the shared renderer. `canonicalUrl` updated on those 12 rows to
  `https://sainthelen.org/<slug>`.
- **Redirects (Step 4).** New
  `import-reconciliation-redirects.ts` merges both bundle manifests
  into `siteSettings.redirects`: `redirects-nextjs.json` (16 — the
  12 `/ministries/<slug>→/<slug>` standalone moves + 4 retired/vanity)
  and `redirects-legacy-fullsite.json` (48 legacy URL retirements).
  Total in DB: 79. Two known-bad targets fixed after import:
  `/from-our-pastor → /p/from-our-pastor` and `/ocia-form →
  /p/become-catholic` (originally pointed at unbuilt routes; now land
  on the new `/p/` pages). 37 entries remain marked **REVIEW** in
  `_note` — they're live but need a parish/council call. Audit them in
  `/admin/settings/redirects` before launch.
- **Step 3 — Mass times correction (partial).** Authoritative schedule
  Sat 5pm; Sun 8/10/12/6 is already correct in `mass_times` and on
  `/mass`. The remaining fabrication was the hardcoded `STEPS`
  constant on `/im-new/page.tsx`: "Sunday at 7:30, 9, 10:30 (Family),
  and 12" → "Sunday Masses at 8 AM, 10 AM, 12 PM, and 6 PM". Also
  removed the unverified train-station and coffee/donuts copy; Kids
  Corner reference changed from "10:30 Mass" → "Sunday Mass".
- **Step 5 — cross-cutting.** (1) Typo fix:
  "Family Support for Persons with **Disabiliites**" →
  "**Disabilities**" in both the live DB row and the source
  `_audit-ministries-seed.ts`. (2) Inquiry-route fallback ladder in
  `app/api/ministries/[slug]/inquire/route.ts`: when no
  `ministryLeads` are assigned, fall back to `ministries.contactEmail`,
  then `siteSettings.welcomeFormRecipients`, then log + still 200 so
  the visitor never sees a failure on a misconfigured ministry.

### June reconciliation — deliberately deferred

- **Subsplash livestream embed** — still waiting on the widget code.
- **`/give` content** — page is still gutted to Heritage Fund. Owner
  needs to provide the canonical copy (Online Giving, Text-to-Give
  GIVE→908-860-8444, Memorial / Restricted / Stock, envelopes/mail).
- **Formation registration links + PDFs** — Religious Ed 2025-26
  registration, 9th/10th schedules, Kids Corner session links, Empowering God's Children lesson PDFs. Owner needs to supply URLs.
- **USCCB readings widget polish** — outbound-link fallback ships.
- **Email/phone scrub across remaining pages** — Mental Health Ministry
  still exposes `lmigneco@sainthelen.org` (HAND_TEMPLATED — must be
  edited via admin). Other pages flagged by the bundle (`/give`,
  `/bulletin`, formation) didn't have inline staff emails to scrub
  after the importer + redirect work.
- **Category taxonomy reconciliation** — kept Next.js's 6 categories
  (worship / formation / fellowship / service / sacraments / music)
  as canonical; WP's 3 mission categories will derive at launch via
  the mapping in `NEXTJS-VS-WP-MINISTRY-AUDIT.md` if needed.
- **37 REVIEW redirect targets** — imported live; need council review.

### Files added this wave

- `website/scripts/import-reconciliation.ts` (copied from bundle)
- `website/scripts/import-reconciliation-pages.ts`
- `website/scripts/import-reconciliation-redirects.ts`
- `website/scripts/update-standalone-canonicals.ts`
- `website/scripts/_fix-reconciliation-redirects.ts`
- `website/scripts/_fix-disabilities-typo.ts`
- `website/scripts/_inspect-pages.ts`, `_inspect-mass-times.ts`
- `website/lib/ministry-route.tsx`
- `website/app/(site)/<slug>/page.tsx` × 12 (standalone roots)

## ✅ Shipped — Wave 17 · July staff ministry punch list (2026-07-24)

Staff reviewed staging and filed a 51-item ministries punch list. Split
into code changes (this commit) + a data script to run against Neon
(this session's sandbox can't reach the DB — Neon host blocked by the
remote environment's egress policy).

**Code (committed, typecheck + lint green; `pnpm build` compiles but
can't prerender in the sandbox because the DB host is egress-blocked):**

- **/ministries search box.** New `MinistriesSearch` island + `?q=`
  server filtering with loose normalization (`lib/search-normalize.ts`):
  "&" ⇄ "and", "st"/"st." ⇄ "saint", hyphens/apostrophes ignored. Fixes
  every "not searchable by …" item (Art & Environment, Called & Gifted,
  Pre Cana, St. Joseph's, GAIM after rename).
- **Ministry hero photo crop.** `PhotoPlaceholder` gained
  `imagePosition`; ministry heroes use `center 22%` so portrait photos
  keep faces in frame (Wedding Ministry torso complaint — the source
  photo was fine, the 5/4 `object-cover` crop wasn't).
- **/p/[slug] inquiry form.** Generic CMS pages that share a slug with a
  published ministry now render that ministry's inquiry form at the
  bottom (the "standalone page needs the volunteer form" items).

**Data script — `website/scripts/staff-ministry-updates-2026-07.ts` —
✅ RUN AGAINST NEON 2026-07-24.** Dry-run previewed (117 planned
changes, 5 expected no-ops), applied, then re-run to prove
idempotency (0 changes). Verified in the DB afterwards
(`scripts/_verify-staff-updates.ts`): all 9 renames, 49 lead links
across 45 ministries, custom form fields, redirects, and zero leftover
editor-note / broken-email artifacts. Re-running it any time is safe.
It covers:

- **Leads + recipients for ~40 ministries** — upserts `users` rows
  (role `ministry_lead`) and replace-sets `ministry_leads`; sets
  `contactEmail` fallback. Inquiry emails go to the staff-specified
  addresses (multi-lead where requested: Care, Hospitality, Wedding,
  Adoration).
- **Renames**: Lector Ministry, Sacristan Ministry, Saint Joseph's /
  Saint Mary's Soup Kitchen, Sunday Gospel Alive in Me (GAIM),
  Westfield Food Pantry Ministry, Kids Corner (Ages 2-5), Pre-Cana
  Marriage Preparation, Abide Young Adult Ministry (Ages 21-35).
- **Copy edits** per the punch list (ageless top-matter, contact-line
  removals, "use the form below" removals, Parish Library→Center,
  Helping Hands envelope sentence, counseling insurance sentence, 4C's
  Hackensack Meridian addition, CLOW Protecting God's Children link,
  Pre-Cana restored sections, Twelve lead-in, Art & Environment
  import-defect repairs, em-dash artifacts).
- **Form fields**: Baptism interest radios (Hospitality / Childcare /
  Prayer Cards), Everyday Contemplatives practice checkboxes
  (Contemplative Prayer / Lectio Divina), Garden availability textarea.
  Volunteer buttons ensured on the standalone ministries.
- **Cleanups**: repairs Cloudflare `[email protected]` artifacts (incl.
  Family Support's Archdiocese contact — dead link dropped, phone
  kept), removes "Learn more on the full page" buttons that point at
  unpublished `/p/…` pages, removes the VBS leaked editor note, adds
  `/veg-garden` + `/kids-corner` legacy redirects.
- **Idempotency note:** two insertion-style edits (CLOW Protecting
  God's Children link, Pre-Cana intro) originally re-applied on every
  run; fixed with `skipIfContains` markers + self-healing repair
  regexes that also cleaned up the double-application.

**Verified before writing the plan:** fetched all ~45 affected staging
pages via the Vercel API — many punch-list items were already fixed by
the June reconciliation (Why It Matters heading, Wedding coordinators,
respect-life dated events, ChristLife casing, CYO name, 21–35 ages);
the script treats those as no-ops.

**Still needs a human** (flagged to Matthew): Abide "Next Gathering"
copy, ChristLife 2026 dates, Adoration volunteering description
(Tracey), Respect Life IVF-talk video edit, Family Support updates
(Maria → Matt), soup-kitchen naming confirmation from Marilyn.

## ✅ Shipped — Wave 18 · Legacy-URL reconciliation (2026-07-28)

Full audit of the live sainthelen.org sitemap (126 URLs) against the new
site. Every legacy URL now resolves — via a real page, a formation/sacrament
route, or a redirect. Two **pre-existing production bugs found and fixed**
along the way. Build green; all 38 redirect paths + 39 destination pages
smoke-tested against a local dev server wired to Neon.

### 🐛 Bug 1 — vanity redirects never ran (middleware export precedence)

`middleware.ts` exported both a named `middleware` (the bare Auth.js
wrapper) and a `default` export (the wrapped handler with the vanity-URL
redirect logic). **Next.js prefers the named `middleware` export**, so the
redirect logic was silently dead since Wave 13.F — all 85 admin-managed
redirects were inert in every environment. Fixed by keeping `auth`
module-private and default-exporting only the wrapped handler. A comment
now guards against regression.

### 🐛 Bug 2 — 12 standalone roots shadowed by stale redirects

The pre-Wave-16 standalone-pages import left `/adoration → /p/adoration`
(× 12, all pointing at *draft* pages that 404 publicly). Once Bug 1 was
fixed these would have broken all 12 standalone ministry URLs. The import
script now deletes them (`REMOVE_FROMS`); the 12 root routes serve directly
again.

### 23 new CMS pages (scripts/import-legacy-pages-2026-07.ts)

Content pulled from the live WP site 2026-07-28, imported via the same
marked → sanitize-html → htmlToBlocks pipeline as June. All published at
`/p/<slug>` with a permanent redirect from the legacy root URL:

pgc · inclusive-mass · marriage (World Marriage Day, cross-links to
/sacraments/marriage + /pre-cana) · more (Programs & Activities hub) ·
path (Discipleship Path) · subscribe · religious-education ·
reled-registration (2026-27 fees + links) · lifeline-resources ·
walk-with-one · connect-survey · fest · sponsor · presence · advent ·
lent · easter-scroll · current-series (message series) · cgteam ·
mens-cornerstone-team-candidates · summer-discipleship-discovery-series ·
synod-recap · ad-lead

Script is idempotent (verified: second run = 0 changes) and safe to re-run.
`DRY_RUN=1` previews.

### Redirect manifest changes (85 → 73 entries)

- +5 new: `/youth → /youth-ministry`, `/stewardship-spotlight/*` (prefix),
  `/message-series` + `/message-series/*`, `/lifelines-resources`.
- 30 REVIEW placeholders retargeted from generic fallbacks (`/`, `/events`,
  `/ministries`, `/contact`) to the real content pages above.
- `/stewardship-spotlight` + `/stewardship-spotlight/*` →
  `/blog?category=stewardship` (per Matthew 2026-07-28).
- `/inclusive-mass-mailing-list` → external OnlineReg URL.
- −12 stale standalone shadows removed (Bug 2).
- **Middleware now supports prefix rules**: a `from` ending in `/*` matches
  every path under it (exact matches win first).

### Giving settings + /give page

- `giving.primaryUrl` filled with `https://my.sainthelen.org/give/make-a-gift`;
  Memorial & Restricted designations added (fill-only-if-empty — admin edits
  never clobbered).
- `/give` page code: new "Other ways to give" section (Text-to-Give GIVE →
  908-860-8444, offering envelopes via sthelen@sainthelen.org, stock &
  securities) + navy "Stewardship Spotlights" banner → /blog?category=stewardship.

### SEO fixes

- `app/sitemap.ts`: added /give, /contact, /sacraments, /baptism, /funerals;
  the 12 standalone ministries now emit their root URL (matches canonicalUrl);
  sacrament pages emit `/sacraments/<slug>` instead of `/p/sacraments-<slug>`.
  122 URLs total (live WP sitemap: 126).
- Homepage finally has its own metadata (absolute title + description).

### ⚠️ Follow-ups / still needs a human

- **wp-content assets**: ~30 links in the imported pages point at
  `sainthelen.org/wp-content/uploads/...` PDFs/DOCX (PGC code of conduct,
  Walk With One guides, LifeLine weekly guides, Called & Gifted library,
  Family Sacrament doc, Inclusive Mass follow-along). They work until the
  DNS flip, then break. Migrate to Vercel Blob (media library) before
  launch — `grep wp-content` across page_sections finds them all.
- **/subscribe** has no embedded signup form — links to text-CONNECT and
  comms.sainthelen.org. If there's a Flocknote/embed URL, add it via the
  admin sections editor.
- **Seasonal pages** (advent, lent, christmas→advent redirect, easter-scroll,
  current-series, fest, sponsor) imported as-is from the current season —
  parish staff should refresh them each season via /admin/pages.
- **DRE contact emails** on reled-registration were Cloudflare-obfuscated on
  the WP side; imported with names + phone extensions only. Add emails via
  admin if desired.
- Subsplash livestream embed still pending (Step 8) — /p/live + /stream +
  /mass all ready for it.

## ✅ Shipped — Wave 18.1 · CMS pages at root URLs (2026-07-28)

Matthew: "I don't want the /p." CMS pages now serve at `/<slug>` directly —
the `/p/` prefix existed only to avoid slug collisions with real routes,
which a reserved-slug validator now handles instead.

- **Route move.** `app/(site)/p/[slug]` → `app/(site)/[slug]` (root dynamic
  segment; static routes always win). `sacraments-*` rows are guarded off
  the root and keep canonicalizing to `/sacraments/<name>`.
- **`/p/*` compat redirects.** New thin `app/(site)/p/[slug]/page.tsx`
  issues a 308 to the root URL (`/p/sacraments-baptism → /sacraments/baptism`).
  Anything bookmarked or indexed under /p keeps working.
- **Reserved slugs.** `lib/validators/pages.ts` exports
  `RESERVED_PAGE_SLUGS` (all top-level routes + admin/api/sign-in etc.);
  the pages editor rejects colliding slugs. **Keep the list in sync when
  adding top-level routes.**
- **DB sweep** (`scripts/move-pages-to-root-2026-07.ts`, idempotent,
  DRY_RUN=1 preview): dropped 37 now-shadowing `/x → /p/x` redirects
  (manifest 73 → 36), retargeted 8 more (`/ocia-form → /become-catholic`
  etc.), rewrote the nav manifest + 19 page_sections payloads; swept
  ministries/posts/events/staff/announcements for stray /p/ links (none).
- **Code links** updated: /give Heritage card, footer privacy-policy link,
  admin pages editor "view on site" links, sitemap (0 /p/ URLs emitted),
  Wave 18 import script (no longer adds /<slug> → /p/<slug> entries — a
  re-run after this wave stays root-serving).
- Converted 3 pre-existing admin `<a href>` to `<Link>` (`no-html-link-for-pages`
  started firing once a root dynamic segment existed).
- **Verified**: all 42 published pages 200 at root; /p/* 308s to root;
  alias redirects land on root targets; sacraments unaffected; typecheck,
  lint, build green. Note: middleware's redirect-list data cache holds
  entries up to 300s, so the first ~5 min after deploy may still serve a
  few stale /p 308s — they resolve to the same pages either way.

## ✅ Shipped — Wave 18.2 · WordPress backend port (2026-07-28)

Matthew supplied a WP Application Password (user `matthew@adventii.com` /
`adventiimedia`; revoke it in wp-admin → Users → Profile when done).
Audited the WP backend via REST: all 87 pages (3 drafts only), the
Redirection plugin (310 rules), FluentForms (21 forms + notification
recipients), and all post types. Three gaps found and closed:

### 1. Blog was empty — 239 posts imported

The `posts` table had ZERO rows while WP holds 253. Imported via
`scripts/import-wp-posts-2026-07.ts` (idempotent, fetches public WP REST,
re-runnable until DNS flip): **138 pastor letters + 101 stewardship
spotlights**, each with sanitized HTML body, summary, publish date, and its
featured image mirrored into Vercel Blob (236 images under
`wp-import/posts/`). Uncategorized strays are classified by slug heuristic.
**14 posts deliberately skipped** (3 news, 10 catechetical "inquire"
articles, 1 messages) — the blog only has pastor/stewardship categories;
adding a third category is a small enum migration + UI chip if wanted.

### 2. WP Redirection plugin — 310 rules ported (214 new)

The parish's operational short links (/pilgrimage, /volunteers, /jubilee,
/communications, /scroll, /easter, /fish-fry, /pasta …) lived only in the
WP Redirection plugin — invisible to every sitemap-based audit.
`scripts/import-wp-redirection-2026-07.ts` (idempotent; needs WP_APP_USER +
WP_APP_PASS) normalizes them (trailing slashes, query-string froms,
sainthelen.org-absolute targets → relative), skips shadowing rules, remaps
six dead WP-era targets, and merges — existing manifest entries always win.
**Manifest: 36 → 250 entries.** Wildcard substitution added to middleware:
`/from-our-pastor/* → /blog/*` maps every old permalink to its imported
post (same for /stewardship-spotlight/* and /spotlight-homepage/*).

### 3. Intake recipients synced from FluentForms

`funeralFormRecipients` = tnydegger, mbrown, asoltys, mboyle (matches WP
Funeral Intake notification); `baptismFormRecipients` = tsowa. Fill-only-
if-empty.

### FluentForms inventory (for scoping — NOT yet on the new site)

Covered already: Funeral Intake ✅ (Wave 15), Baptism ✅ (Wave 15),
Prayer Requests — page exists, but submission API is still the deferred
`/api/prayer-request` (recipients on WP: Prayer@sainthelen.org,
reginacook1022@gmail.com, tnydegger@sainthelen.org). **Not built** (mostly
internal staff workflow forms): Parish Communication Form
(mdugan+mboyle), Bulletin Submission (mdugan), Email Blast (mdugan),
Pre-Mass Screen Submission (mdugan+matthew@adventii), Website Update
(mboyle), Space Reservation (csteiner), Ministry Registration (mdugan),
Worship Band Audition (asoltys), New OCIA Form (OCIA@, faith@, +2),
Parish Registration, Jubilee Large Group, Inclusive Mass Mailing List
(currently redirected to OnlineReg). Needs a scoping call: build as
generic CMS form pages, or keep on an external form tool.

### Also noted

- **sh_event CPT: 60 events on WP** vs 5 dev-seed rows in the new events
  table. ACF date fields aren't exposed over REST, so no clean automated
  import — parish staff should enter upcoming events via /admin/events
  (most of the 60 are past events).
- WP WAF throttles rapid REST calls (intermittent 415s) — both import
  scripts carry retry/backoff.
- Media-migration reminder grew: post bodies contain inline
  wp-content <img>/PDF links; featured images are already mirrored.

## ✅ Shipped — Wave 18.3 · OCIA form + prayer requests (2026-07-28)

Per Matthew: of the 11 remaining WP FluentForms, only OCIA is needed
(plus wiring prayer requests); the rest are dropped. Events entered
manually by staff.

- **OCIA inquirer form** at `/ocia-form` — third intake form on the Wave 15
  pattern: `lib/validators/ocia.ts` (same questions/options as FluentForm
  #24), `lib/pdf/ocia.ts` section builders, `POST /api/ocia`
  (rate-limited 3/hr, PDF + email + form_submissions row, kind "ocia"),
  `components/forms/OciaForm.tsx`. Admin form-submissions list/detail
  handle the new kind. Recipients editable in /admin/settings
  (seeded: OCIA@, faith@, mike.murphy@comcast.net, llphd@yahoo.com).
  Name+email required; everything else optional (legacy form required
  nothing). become-catholic page gained a CTA section linking the form;
  the old `/ocia-form → /become-catholic` redirect was removed (it would
  have shadowed the route).
- **Prayer requests live on `/prayers`** — dedicated route renders the
  admin-editable "prayers" CMS page content and appends the form
  (matches the WP page, which embedded FluentForm #13). `POST
  /api/prayer-request` clones the welcome relay: rate-limited, nothing
  persisted, straight to `prayerFormRecipients` (seeded: Prayer@,
  reginacook1022@gmail.com, tnydegger@) with Reply-To the requester.
  Fields match WP: email* / person being prayed for* / reason* / phone /
  comments.
- **Migration 0023** adds `ocia_form_recipients` + `prayer_form_recipients`
  to site_settings (applied to Neon). `FORM_SUBMISSION_KINDS` gains "ocia"
  (text column — no SQL change).
- Verified: /ocia-form + /prayers 200, become-catholic shows the CTA,
  prayer API happy path ok (console-fallback email), both APIs 400 with
  field errors on bad payloads, typecheck/lint/build green.
- **Dropped by decision (2026-07-28):** Parish Communication, Bulletin
  Submission, Email Blast, Pre-Mass Screen, Website Update, Space
  Reservation, Ministry Registration, Worship Band Audition, Parish
  Registration, Jubilee Large Group, Inclusive Mass Mailing List (stays an
  external OnlineReg link). WP sh_event entries: staff enter upcoming
  events manually via /admin/events.

## ✅ Shipped — Wave 18.4 · Our Team + media migration (2026-07-28)

- **Our Team is now database-driven.** `/our-team` previously rendered 42
  scraped prose blocks disconnected from the staff table. Rebuilt
  (`scripts/rebuild-our-team-2026-07.ts`) as heading + `staff_card`
  sections referencing staff rows: Clergy (name-prefix detection —
  Rev./Fr./Msgr./Deacon) then Parish Staff, ordered by orderingPriority.
  Editing/deactivating a person in `/admin/staff` now updates the page
  automatically; the old prose blocks are backed up at
  `scripts/data/our-team-sections-backup-2026-07-28.json`. Staff table
  holds 17 active real staff with photos (4 dev-seed rows deactivated).
- **wp-content media migration COMPLETE** (`scripts/migrate-wp-media-2026-07.ts`,
  idempotent — blob_assets.caption records each source URL for re-run
  dedupe). 82 unique assets (PGC/harassment/whistleblower policies,
  Called & Gifted library, LifeLine weekly guides, Walk With One guides,
  WWP FAQ, Family Sacrament doc, Respect Life docs from the dead
  adventii.dev mirror, inline post images) downloaded from the live WP
  host, mirrored into Vercel Blob under `wp-import/files/`, and every
  reference rewritten across page_sections, posts, and site settings
  (incl. redirect targets like /pilgrimage → PDF). Combined with 18.2's
  236 post images: **zero own-host wp-content references remain in the
  database** — the media dependency on WordPress is fully severed.
  External hosts' wp-content (rcan.org, olastrafford.org) deliberately
  left alone.
- The full WP media library (unreferenced files) is NOT mirrored — take a
  one-time backup of `wp-content/uploads` before decommissioning WP if an
  archive is wanted.

## 🎨 In review — Wave 19 · Design refinement pass (branch `claude/design-refinement`)

Adjustment pass over the EXISTING design system (explicitly not a redesign),
driven by the taste-skill redesign audit + styleseed coherence rubric
Matthew supplied. Full before/after screenshot loop against real content.

- **Generic page template** (`[slug]`, biggest win — 40+ pages): the
  public-facing "Page hero" placeholder box is gone (photo column renders
  only when a photo exists); body copy sits on a ~70ch reading measure
  (was ~120 chars full-container); media/grid blocks still span wide;
  optical padding (bottom > top). Same treatment on /prayers +
  /sacraments/[slug].
- **Heading hierarchy carries meaning** (SectionRenderer): bare headings
  (imported prose) render at content scale without the rust rule; designed
  section heads (eyebrow/subheading present, or any homepage block) keep
  the big display treatment. Before: every imported heading shouted at
  page-title size with an identical rule.
- **Blog detail**: duplicated dek removed (summaries are excerpts of the
  opening paragraph); cover is an inset 3:2 figure anchored `center 25%`
  instead of a full-bleed 16/9 that decapitated portrait photos; the
  `(photoUrl || true)` always-placeholder bug fixed.
- **Post summaries** re-imported with word-boundary truncation + ellipsis
  (was cutting mid-word: "was har"); picked up 1 brand-new WP post.
- **Texture + physicality** (globals): `.sh-grain` film-grain overlay on
  flat navy fields (footer, dark callout banners); pressed-state
  `translateY(1px)` on buttons/pill CTAs; `.sh-tabular` figures on Mass
  times.
- **Strategic omissions closed**: skip-to-content link, branded
  `app/error.tsx`.
- Gates: typecheck, lint, build, 468 tests green. NOT merged — preview
  deployment for Matthew's review.

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

## Wave 19 — test harness, CI, role predicates, starter layouts

Built 2 August 2026. Everything below is additive; no existing behaviour was
changed.

### 19.0 — the safety net

Before this wave the repo had zero test files, no CI, and no `.github`
directory. 38,000 lines with nothing watching them.

- **Vitest** (`vitest.config.ts`, `tests/setup.ts`). Runs in Node, no jsdom,
  no network. `TZ` pinned to `America/New_York` — the parish's zone, not
  Vercel's UTC, because several date bugs only surface when the two differ.
- **`.github/workflows/ci.yml`** — `typecheck`, `lint`, `test` on every push
  and PR, pnpm 10 / Node 22, concurrency-cancelled per branch. Deliberately
  does **not** run `next build`: the build needs `DATABASE_URL` and the auth
  secrets, and Vercel already builds every push.
- **221 tests across 6 suites.** See `website/tests/README.md` for the map.
- **`tests/fixtures/sections.ts`** — one valid payload per block kind,
  exhaustive-checked against `PageSectionPayload` at compile time. Add a
  block kind and this file stops type-checking until you add it there.
- **Integration tests** (`tests/integration/*.db.test.ts`) skip unless
  `TEST_DATABASE_URL` is set. Verified locally against Postgres 16 with all
  24 migrations applied.

### 19.1 — `lib/redirect-match.ts`

The vanity-redirect matching logic was inlined in the `auth(...)` closure in
`middleware.ts`, where it could not be tested without standing up NextAuth
and a `NextRequest`. Lifted out verbatim into three pure functions —
`shouldSkipRedirects`, `matchRedirect`, `resolveRedirectTarget` — plus
`redirectStatus`. `middleware.ts` now calls them. No behaviour change; 29
tests around it, including the Wave 18 failure mode.

### 19.2 — `lib/authz.ts`

The same role check was copy-pasted into ~24 server-action files and the
copies had drifted into three different spellings. `staff/_actions.ts` named
its guard `requireWriter` but was admin-only; `homepage/_actions.ts` named
its guard `requireAdmin` but was the writer check. With three roles the
spellings agree. With a fourth they would not, silently, in whichever files
nobody remembered to update.

`lib/authz.ts` is now the single matrix: `canWriteContent`, `canAdminister`,
`canAccessMinistry`, `inquiryScopeFor`. All 24 files call it. **Behaviour is
identical for all three current roles** — including the two oddly-named
guards, which were preserved exactly and annotated rather than "fixed". The
naming and the homepage/staff asymmetry are open questions, not decisions
this wave made.

### 19.3 — starter layouts

`lib/page-starter-layouts.ts` plus a picker on `/admin/pages/new`. Choosing
a layout seeds ordinary `page_sections` rows and gets out of the way: no
template entity, no link back, nothing to keep in sync. After creation the
rows are indistinguishable from blocks added by hand.

Four options: **Blank**, **Simple text page** (heading / rich text /
callout), **Ministry landing** (image+text / rich text / featured events /
buttons), **Upcoming event** (callout with registration CTA / overview /
card grid for dates or sessions / link list for documents / buttons — built
for pilgrimages, retreats and series like the Eucharistic Congress, Manresa,
World Marriage Day).

Seeding is deliberately **not** in a transaction with the page insert. If
seeding fails the page is still created empty, because a create button that
appears to do nothing is worse than a page you have to fill in by hand.

Also fixed here: the slug hint on the page form still said `/p/<slug>`,
stale since Wave 18.1.

### Known gaps pinned by tests — items 1–3 fixed in Wave 21

These are real defects on the current build. Each has a test that documents
current behaviour so a change is deliberate rather than accidental. All are
in `tests/recurrence.test.ts` under `known gaps`, except the last two.

1. **DST is not handled in recurrence expansion.** Expansion copies the base
   event's *UTC* clock onto every generated day. A 7pm ET event created in
   August is stored as `23:00Z` and still emits `23:00Z` in November, which
   is 6pm ET. Every recurring event shifts by an hour for half the year.
   Fixing it means expanding in `America/New_York` rather than UTC, and
   `lib/dates.ts` needs an explicit `timeZone` at format time too.
2. **Exception dates silently no-op for a non-UTC admin.** `RecurrenceEditor`
   builds the exception timestamp with `base.getHours()` (browser-local) fed
   into `Date.UTC(...)`, while expansion generates with `getUTCHours()`. For
   anyone outside UTC the strings do not match, so the cancelled week still
   appears. Highest-priority of the three — it fails quietly and looks like
   the editor is broken.
3. **A weekly `until` is checked against the week, not the occurrence.** The
   loop tests the Monday-anchored cursor, so an occurrence can land a few
   days past the end date.
4. **The embed "allowlist" does not constrain hosts.** `provider` selects
   the wrapper markup and iframe height; the URL is only checked for being
   parseable. A `google_form` embed can point anywhere, and `javascript:` /
   `data:` URLs pass validation because zod's `.url()` delegates to the URL
   constructor. Admin-only input, so this is hardening rather than an open
   hole — but it is described as an allowlist and is not one. Pinned in
   `tests/page-sections-validator.test.ts`.
5. **There are 17 block kinds, not 18.** 16 leaves plus `columns`. This doc
   and the handoff notes both said 18.

---

## ✅ Answer engine live on Neon (2026-08-04)

Migration `0024_answer_engine` applied and the 52 starter cards seeded.

- **Migration**: this session's sandbox can't reach Postgres on :5432
  (drizzle-kit's path), so 0024 was applied over the Neon HTTP driver
  by `scripts/_apply-0024.ts` — same statements, and the run was
  recorded in `drizzle.__drizzle_migrations` with drizzle's own
  hash/`when` convention, so a future `pnpm db:migrate` sees it as
  applied. All four tables created: `answer_cards`, `answer_searches`,
  `answer_feedback`, `answer_rate_limits`.
- **Seed**: new `pnpm answers:seed` runner (`db/seed/answer-cards.run.ts`,
  `--dry-run` supported; insert-only by key so admin edits survive).
  Dry-run previewed 52/52, apply inserted 52, re-run skipped 52 —
  idempotent. DB state verified: 42 published + 10 pastoral cards in
  `review`, 6 seasonal cards carrying activation windows.
- **Live check**: production `/api/answers/corpus` returns exactly 36
  cards — 52 minus the 10 review-gated pastoral cards minus the 6
  seasonal cards outside their windows in August — with full trigger
  and answer payloads. Activation-window logic confirmed working.

## Wave 20.A — the answer engine, core

Ported from the WordPress plugin **Saint Helen Answers 2.4.1-b**. The PHP was
never the asset; the behaviour is, and it now lives in `lib/answers/` with
173 tests of its own.

### What is built

- `lib/answers/normalize.ts` — one normaliser. WordPress had two that
  disagreed about hyphens, so the text used for matching and the text stored
  for reporting were different strings.
- `lib/answers/match.ts` — the scoring ladder (exact 100, substring 60, token
  equals trigger 45, token in trigger 30, fuzzy 25), Levenshtein, and the
  page fallback. Scores never accumulate; a card's score is always one of
  {0, 25, 30, 45, 60, 100}.
- `lib/answers/liturgical.ts` — anonymous Gregorian computus and the eleven
  feasts. Asserted against the published calendar 2025–2030, plus Easter
  falling on a Sunday between Mar 22 and Apr 25 for every year to 2060.
- `lib/answers/resolve.ts` — moment/timeline resolution and the new
  activation window.
- `lib/answers/blocklist.ts` — URL blocking, enforced at save and at render.
- `lib/answers/scrub.ts` — the PII scrub for free text and search terms.
- Three tables + a rate-limit table (`0024_answer_engine.sql`), verified
  against a real Postgres 16 with all 25 migrations applied.
- `db/seed/answer-cards.ts` — the 52 starter cards, ten pastoral ones held in
  review.

### Deliberate departures from WordPress

Agreed with Matthew: fix the ones that matter, keep the rest identical.

1. **Two-letter queries no longer hijack the substring rung.** `"st"` used to
   score 60 against every trigger containing those letters — "christmas
   mass", "first communion" — and outranked genuine word matches. There is
   now a four-character floor on that rung.
2. **A token must be a word, not any run of letters.** `"car insurance"`
   returned the childcare card, because "car" sits inside "childcare" and
   "careers". A token now has to be a whole word in the trigger, or a
   four-character-or-longer prefix of one, which is what keeps "confess"
   finding "confession".
3. **One result count, and it is what the visitor saw.** WordPress computed
   this two ways for the same interaction, so "shown 2nd of 9" could appear
   for a screen that only ever held two cards. `match_count` is stored
   separately because it answers a different question.
4. **The blocklist no longer has a query-string hole.** `/baptism?src=email`
   was not blocked by a rule on `/baptism/`. For a page whose entire purpose
   is "must never be discoverable", that was the whole point.
5. **Search terms are scrubbed too.** WordPress scrubbed the follow-up
   sentence and kept the raw search term unscrubbed for 400 days.
6. **The phone scrub no longer eats Mass times.** The old pattern was "ten or
   more characters of digits and separators", which redacted "mass at 8 9 10
   11 12" entirely.
7. **`answer_cards.key` is unique**, and a visitor votes once per card per
   search. WordPress guarded the second with a flag on a DOM node that every
   re-render destroyed.
8. **Unknown liturgical rules fail loudly** rather than making the line
   vanish.

### The activation window — new behaviour

Six seed cards carried notes like *"Activate 3 weeks before, archive the day
after"* and sat in a group called *"Seasonal, activates on its own"*. Nothing
implemented it: the Christmas card was searchable in June. Cards now carry an
optional window and are only findable inside it. The windows are read
straight off the cards' own notes — Advent opens Nov 20, Christmas opens
Dec 1, Ash Wednesday three weeks before and gone the day after.

### Not built yet (20.B)

API routes (`/api/answers/corpus`, `/api/answers/event`), the public search
widget, and the admin screens for cards, analytics and dead ends. The
bulletin PDF reader is deliberately out of scope for now; `protected_keys()`
belongs with it.

---

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
