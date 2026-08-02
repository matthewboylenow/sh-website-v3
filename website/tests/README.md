# Tests

```bash
pnpm test           # everything that runs without a database
pnpm test:watch     # same, watching
pnpm test:coverage  # with a v8 coverage report
```

CI runs `typecheck`, `lint` and `test` on every push and pull request
(`.github/workflows/ci.yml`). It does **not** run `next build`, because the
build needs `DATABASE_URL` and the auth secrets, and a CI job that needs
production credentials is a job somebody eventually turns off. Vercel builds
every push already.

## What is covered

| Suite | What it guards |
| --- | --- |
| `recurrence.test.ts` | Occurrence expansion for weekly and monthly-nth rules, exceptions, end conditions, runaway protection |
| `redirect-match.test.ts` | The vanity-URL matcher behind the 250-entry redirect manifest ported from WordPress |
| `authz.test.ts` | The role matrix — who may write content, who may administer, ministry-lead scoping |
| `page-sections-validator.test.ts` | Every block kind, the caps, the embed allowlist, columns nesting |
| `section-renderer.test.tsx` | Every block kind rendered to markup, including the missing-data paths |
| `page-starter-layouts.test.tsx` | The "+ New page" starter layouts validate and render on a page with nothing uploaded yet |

`tests/fixtures/sections.ts` holds one valid payload per block kind and is
exhaustive-checked against the union at compile time. Add a block kind and
the fixtures file stops type-checking until you add it there too.

## Integration tests

`tests/integration/*.db.test.ts` need a real Postgres. They **skip silently**
when `TEST_DATABASE_URL` is unset, which is why CI stays green without one.

To run them locally against a throwaway database:

```bash
# 1. a database with the migrations applied
createdb sh_test
for f in db/migrations/*.sql; do
  sed 's/--> statement-breakpoint//' "$f" | psql -d sh_test -v ON_ERROR_STOP=1
done

# 2. run
TEST_DATABASE_URL=postgresql://localhost/sh_test pnpm test
```

Do not point this at the Neon production or preview branch. The suite writes
rows and deletes them afterwards, but it is not worth finding out what
happens when a cleanup fails.

Note that `drizzle-kit push` will not work against a plain local Postgres —
`drizzle.config.ts` uses the Neon serverless driver, which needs a websocket
endpoint. Applying the migration SQL directly, as above, is the way.

## Conventions

- The suite runs with `TZ=America/New_York` (set in `tests/setup.ts`). The
  parish is in Westfield; Vercel runs UTC. Several date bugs only appear
  when those two disagree, so the tests run in the parish's zone on purpose.
- Nothing hits the network. `PodcastEpisodeBlock` is the only block that
  fetches at render time, and it is mocked.
- Tests in a `known gaps` block pin **current** behaviour, not desired
  behaviour. Each one names the bug it is documenting. If you fix the bug,
  change the test and say so in STATUS.md — do not delete it.
