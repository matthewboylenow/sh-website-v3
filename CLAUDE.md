# Saint Helen 3.0 — Working Notes for Claude

This is a redesign of **sainthelen.org**, a Catholic parish website. The job is to take the static HTML/CSS mockup in `/design-ref` and ship a production Next.js 15 application in `/website`.

## Hard rules

1. **Never edit anything under `/design-ref`.** It is the design + architecture source of truth (HTML mockup, CSS tokens, JS, written specs). Treat it as read-only reference. If a doc is wrong, raise it; do not silently fix it.
2. **All application code lives under `/website`.** Nothing else gets created at the repo root unless asked.
3. **Read `STATUS.md` and the relevant `/design-ref/pages/*.html` before writing code.** Every session, every time. `STATUS.md` is the running log of what's shipped, what's in flight, what's queued, and what's broken. Update it after every meaningful step.
4. **Test as you go.** Build, type-check, and any tests must be green at the end of every step before declaring done. The user has explicitly said they hate finding flaws after the fact.
5. **The four spec docs in `/design-ref/pages/` are authoritative.** Order of precedence: `backend.html` > `handoff.html` > `design-notes.html` > `components.html` > the HTML mockup.

## Reading order before coding

1. `STATUS.md` (project root) — what state is the build in?
2. `design-ref/pages/design-notes.html` — *why* 3.0 exists. Four focus areas: newcomer clarity, Mass-time findability, stronger Give presence, photography modernization.
3. `design-ref/pages/components.html` — token + component inventory.
4. `design-ref/pages/handoff.html` — front-end architecture, file mapping, route map, interactive contracts.
5. `design-ref/pages/backend.html` — schema, API, admin, auth, integrations, backups, a11y, staging. **Read in full** when work touches data, auth, admin, or infra.

The mockup pages (`home.html`, `pages/*.html`, `assets/*`) are the visual reference. The `design-ref/index.html` review hub is not part of the shipped site.

## Stack — fixed by the spec

- **Next.js 15** (App Router, RSC default; `"use client"` only for islands listed in handoff §07). **Never use Next 16.** Stay on the latest 15.x.
- **Tailwind** + CSS variables (port `assets/colors_and_type.css` to `tailwind.config.ts` and keep the `:root` vars in `@layer base`).
- **shadcn/ui** as base for Dialog / Popover / Sheet / Tabs / Form (restyle, don't replace).
- **Neon Postgres + Drizzle ORM** — branch per PR.
- **Auth.js** with two parallel sign-in methods: magic-link email (Resend) + SMS code (Twilio Verify); roles `admin | editor | ministry_lead`.
- **Vercel Blob** behind `cdn.sainthelen.org` (rewrite, not direct CNAME) for photos and PDFs.
- **Resend** transactional email; sender on `send.sainthelen.org`.
- **Subsplash** for Mass livestream — embed widget supplied by the user.
- **Touchpoint** for giving via outbound links (URLs in `siteSettings.giving`). No Stripe, no PCI scope.
- **Fathom** analytics, production only.
- **Vercel** hosting; `staging.sainthelen.org` from a `staging` branch.

## Resolved decisions (so far)

- **Day-1 admin:** `mboyle@sainthelen.org`. (User emails as `matthew@adventii.com` — that's their dev address, not the seeded user.)
- **Livestream provider:** Subsplash. User will supply the embed widget.
- **Matchmaker manifest:** lives in the custom admin (no headless CMS). v1 is a **form-based editor** (questions → answer rows → per-answer ministry tag weights). Drag-and-drop visual logic-tree editor was discussed and deferred — revisit only if a form-based editor proves insufficient.
- **Spanish multilingual:** deferred indefinitely. Don't add locale columns to initial migrations.
- **Bulletin:** modal only (no individual bulletin page routes). Deep-link via URL hash on `/bulletin`. Rationale: parishioners consume current-week bulletins, not search for archived ones.

## Routes (top level)

- `app/(site)/…` — public site: `page.tsx` (home), `im-new`, `mass`, `events`, `events/[slug]`, `ministries`, `give`, `bulletin`, `contact`
- `app/(admin)/admin/…` — list + editor for events / mass-times / ministries / staff / bulletins / seasonal banners + `settings`, `users`, `account`, `approvals`, `media`, `backups`
- `app/api/…` — public: `welcome`, `prayer-request`, `matchmaker`, `readings` (Edge, USCCB proxy), `mass-times`, `revalidate`; auth: `auth/[...nextauth]`; admin CRUD per content type + `admin/upload(/complete)`; `cron/backup`

## Client islands (only these need `"use client"`)

Header mega-menu, mass day picker, events filters (URL-synced), ministry matchmaker quiz, bulletin modal, mobile Give FAB, a11y widget, admin form widgets.

## Feature flags (defaults)

- `ENABLE_GIVE_FAB=true`
- `ENABLE_LIVESTREAM=true`
- `ENABLE_A11Y_WIDGET=true`
- `ENABLE_MINISTRY_SELF_SERVICE=false` — built but dark at launch

## Deliberately NOT in scope

Do not build any of these without an explicit scoping conversation first:

- Parishioner accounts of any kind (public site stays anonymous)
- In-house payments / Stripe / PCI surface
- Block editor v2 (field-based v1 is the launch shape)
- Multilingual content (deferred)
- Audit log, scheduled publishing, soft-delete restore UI, full-text search — see `backend.html §17`

## Build order (from `backend.html §16`)

1. Design system (tokens, globals, `/design-system` showcase, a11y widget)
2. Database (Drizzle schema + initial migration + dev seed + day-1 admin)
3. Public site (homepage + 3 interiors against fixtures, then wired to DB)
4. Admin shell + events editor as canonical pattern, then sign-in (both methods), then ministry-edit workflow (dark) + Matchmaker form-based editor
5. Upload + CDN
6. Public API routes
7. Backups + staging
8. External integrations (Resend domain, Twilio Verify, Fathom, Subsplash embed)

The user is OK batching whole steps before review, **provided each step is genuinely tested before claiming done.** Match the mockup pixel-for-pixel at 1440 px first, responsive down to 360 px second.

## Conventions

- Public reads = direct Drizzle queries inside Server Components, wrapped in `unstable_cache` with a tag. No central `queries.ts`. Co-locate (`EventCard.query.ts`).
- Admin mutations end with `revalidateTag(...)`.
- Every photo slot is **placeholder-friendly** — components render a styled empty state with a photo brief when no asset is bound.
- Inline link color is `--sh-rust-dark` (#A73F25), not base rust.
- Focus ring: 2 px rust outline, 3 px offset.
- `next/image` everywhere; whitelist `cdn.sainthelen.org` in `images.remotePatterns`.
- Schema.org: `Event` schema on the Mass page (per Mass) and Events page; `Organization` on root layout.
- Forms: React Hook Form + Zod; submit to a Route Handler.
- Package manager: **pnpm**.
