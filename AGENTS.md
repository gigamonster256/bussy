# AGENTS.md

## Overview

Texas A&M bus arrival notification service. Bun monorepo with Effect-TS, MySQL, and SolidJS.

## Commands

| Task | Command |
|---|---|
| Install | `bun install` |
| Dev (all) | `bun dev` |
| Dev server only | `bun dev:server` |
| Dev web only | `bun dev:web` |
| Build all | `bun build` |
| Typecheck all | `bun check` |
| Lint | `bun lint` (oxlint) |
| Format | `bun fmt` (oxfmt) |
| Test all | `bun test` |
| Test single pkg | `bun --filter @bussy/server test` |
| Single test file | `cd packages/server && bun vitest run test/device.test.ts` |
| DB generate | `bun --filter @bussy/server db:generate` |
| DB migrate | `bun --filter @bussy/server db:migrate` |

After changes, run: `bun lint && bun check && bun test`

## Monorepo Structure

```
packages/
  schemas/      — @bussy/schemas: shared Effect schemas, ID generation (leaf, no internal deps)
  api/          — @bussy/api: HTTP API contract definition (@effect/platform HttpApi)
  aggie-api/    — @bussy/aggie-api: Aggie Spirit transit API client (external TAMU API)
  server/       — @bussy/server: Bun HTTP server, Drizzle ORM, business logic
  web/          — web: SolidJS + Vite + Tailwind v4 frontend
```

Dependency flow: `web → api, schemas` / `server → api, aggie-api, schemas` / `api → schemas`

## Key Conventions

- **Effect-TS everywhere**: Services use `Effect.Service`, layers, `Effect.gen`, schema validation. Import `effect` and `@effect/*` packages.
- **Path aliases**: All packages use `@/*` → `./src/*` and `@test/*` → `./test/*` (configured in each tsconfig.json).
- **Drizzle schema files**: Named `*.sql.ts` in `packages/server/src/`. Migrations live in `packages/server/migrations/`.
- **Testing**: Vitest via `@effect/vitest`. Use `it.effect()` for effectful tests. Provide dependencies with `Effect.provide(TestLayer)`.
- **ID format**: ULID with typed prefixes (`dev_`, `sub_`) — see `@bussy/schemas` `createID`.
- **Web frontend is SolidJS**, not React (despite `.tsx` files).
- **Formatter is oxfmt**, linter is oxlint — not prettier/eslint.
- **TypeScript 6.0.3** with `@tsconfig/bun` base config.

## Environment

- MySQL required. Dev setup via Nix flake (`devenv`): creates `bussy_dev` and `bussy_test` databases with user `bussy:bussy`.
- Copy `.env.example` to `.env`. VAPID keys needed for push notifications (`bunx web-push generate-vapid-keys --json`).
- CI uses pnpm (see `.github/`), but local dev uses bun.
