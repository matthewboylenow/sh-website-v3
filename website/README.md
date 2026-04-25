# Saint Helen 3.0 — Web

Next.js 15 application for [sainthelen.org](https://sainthelen.org). Public site, custom `/admin`, and API live in this single app.

For project-level context, see:

- [`/CLAUDE.md`](../CLAUDE.md) — rules, stack, conventions
- [`/STATUS.md`](../STATUS.md) — what's shipped, what's next, open questions
- [`/design-ref/`](../design-ref/) — read-only design + architecture source of truth (don't edit)

## Local dev

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # production build
```

Node 20+ and pnpm 10+. Created with `create-next-app@15` (Next.js 15.5.x, React 19, Tailwind 4, App Router, TypeScript). **Stay on Next 15.x — do not upgrade to Next 16 without an explicit conversation.**

## Routes today

- `/` — homepage stub (Step 1 of 8)
- `/design-system` — token reference page

The other routes from the spec arrive in Step 3. See `STATUS.md` for the queue.
