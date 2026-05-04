# AGENTS.md

## Overview

Texas A&M bus arrival notification service. Bun monorepo with Effect-TS, MySQL, and SolidJS.

## Commands

| Task | Command |
|---|---|
| Install | `bun install` |
| Dev (all) | `bun dev` |
| Dev server only | `bun dev:server` (`bun --watch src/index.ts`) |
| Dev web only | `bun dev:web` |
| Build all | `bun build` (only `server` and `web` have build steps) |
| Typecheck all | `bun check` |
| Lint | `bun lint` (oxlint) |
| Format | `bun fmt` (oxfmt) |
| Test all | `bun test` |
| Test single pkg | `bun --filter @bussy/server test` |
| Single test file | `cd packages/server && bun vitest run test/device.test.ts` |
| DB generate | `bun --filter @bussy/server db:generate` (Drizzle Kit) |
| DB migrate | `bun --filter @bussy/server db:migrate` (Drizzle Kit) |

After changes: `bun lint && bun check && bun test`

## Monorepo Structure

```
packages/
  schemas/      — @bussy/schemas: shared Effect schemas, ID generation (leaf, source-only)
  api/          — @bussy/api: HTTP API contract (@effect/platform HttpApi, source-only)
  aggie-api/    — @bussy/aggie-api: Aggie Spirit transit API client (source-only)
  server/       — @bussy/server: Bun HTTP server, Drizzle ORM, business logic
  web/          — web: SolidJS + Vite + Tailwind v4 frontend
```

Dependency flow: `web → api, schemas` / `server → api, aggie-api, schemas` / `api → schemas`

`schemas`, `api`, and `aggie-api` export directly from `./src/index.ts` (no build step). Only `server` and `web` produce output.

## Key Conventions

- **Effect-TS everywhere**: Services use `Effect.Service`, layers, `Effect.gen`, schema validation.
- **Path aliases**: All packages use `@/*` → `./src/*` and `@test/*` → `./test/*` in tsconfig paths.
- **Config loading**: `BussyConfig` = `ConfigProvider.orElse(ConfigProvider.fromEnv(), () => defaults)` — env vars override hardcoded defaults. Sensitive values (DATABASE_URL, VAPID keys) come only from the environment.
- **Drizzle**: Schema files named `*.sql.ts` in `packages/server/src/`. Migrations in `packages/server/migrations/`. MySQL/MariaDB dialect.
- **Testing**: Vitest via `@effect/vitest`. Use `it.effect()` for effectful tests. Server tests run Drizzle migrations against `bussy_test` DB in `setupTests.ts`.
- **ID format**: ULID with 3-char prefixes (`dev_`, `sub_`) — see `@bussy/schemas` `createID`.
- **Web frontend is SolidJS**, not React (despite `.tsx` files).
- **Formatter is oxfmt**, linter is oxlint — not prettier/eslint.
- **TypeScript 6.0.3** with `@tsconfig/bun` base and `@effect/language-service` plugin.
- **Lockfile**: `bun.lock` (Bun native). CI uses pnpm instead.

## Environment

- MySQL required. Dev setup via Nix flake (`devenv`): creates `bussy_dev` and `bussy_test` databases with user `bussy:bussy`.
- Copy `.env.example` to `.env`. Key variables:
  - `DATABASE_URL` — MySQL connection string (default: `mysql://bussy:bussy@localhost:3306/bussy_dev`)
  - `TEST_DATABASE_URL` — test DB (default: `mysql://bussy:bussy@localhost:3306/bussy_test`)
  - VAPID keys for push notifications (`bunx web-push generate-vapid-keys --json`)
- CI uses pnpm (see `.github/`), but local dev uses bun.
