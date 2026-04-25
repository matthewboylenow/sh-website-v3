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
| 4 | Admin shell, auth, ministry edits, matchmaker editor | ⬜ Queued |
| 5 | Upload + CDN (Vercel Blob → cdn.sainthelen.org) | ⬜ Queued — needs DNS |
| 6 | Public API routes | ⬜ Queued |
| 7 | Backups + staging | ⬜ Queued |
| 8 | External integrations (Resend / Twilio / Fathom / Subsplash) | ⬜ Queued |

Build sequence is from `design-ref/pages/backend.html §16`.

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

### Step 4 · Admin
- `(admin)/admin` shell (rail + topbar) per `backend.html §06`.
- Events editor first (canonical pattern), then mass-times / ministries / staff / bulletins / seasonal-banners.
- Sign-in page with Email-link and SMS-code tabs.
- Ministry self-service draft → approve workflow (built dark; flag `ENABLE_MINISTRY_SELF_SERVICE=false`).
- **Matchmaker editor (form-based v1)** — edits the questions, answer rows, and per-answer ministry tag weights. Drag-drop visual tree explicitly deferred per resolved decisions.

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

## 🐛 Known issues

None at the moment — Step 2 is green.
