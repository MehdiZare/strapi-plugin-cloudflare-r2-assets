# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Canonical reference

Read `AGENTS.md` first — it is the single source of truth for contribution workflows, repo commands, environment variables, release process, and guardrails.

## Commands (quick reference)

```bash
npm install            # install deps
npm test               # run vitest
npm run build          # build plugin
npm run verify         # strapi-plugin verify
npm run check:artifacts # ensure dist/ contains required files
npm run watch          # dev mode
npm run watch:link     # dev mode with yalc link
```

## Architecture

### Three entry points

The package exposes three Strapi integration surfaces via `package.json` exports:

| Export path        | Source                    | Build output (CJS / ESM)                          | Role                              |
|--------------------|---------------------------|---------------------------------------------------|-----------------------------------|
| `.` (root)         | `src/provider/index.ts`   | `dist/provider/index.js` / `dist/provider/index.mjs` | Upload provider (R2 + image URLs) |
| `./strapi-server`  | `server/src/index.ts`     | `dist/server/index.js` / `dist/server/index.mjs`     | Server-side plugin (status API)   |
| `./strapi-admin`   | `admin/src/index.ts`      | `dist/admin/index.js` / `dist/admin/index.mjs`       | Admin panel (diagnostics page)    |

### Shared modules

`src/shared/` contains modules used by both the provider and the server:

- `config.ts` — env-var parsing and config resolution (Zod schemas)
- `url-builder.ts` — Cloudflare edge image resizing URL construction
- `path.ts` — object-key / path helpers
- `types.ts` — shared TypeScript types
- `constants.ts` — default values

### Build outputs

`dist/` is committed only in release tags (via `version` lifecycle script). During development it is gitignored. The build is driven by `@strapi/sdk-plugin`.

### Tests

All tests live in `tests/*.test.ts` and run with Vitest. They cover the shared modules (config, path, url-builder).

## Documentation roles

| File        | Purpose                                    |
|-------------|--------------------------------------------|
| `AGENTS.md` | Contributor guide — authoritative reference |
| `LLM.md`    | Integration and installation guide          |
| `README.md` | Public-facing project overview              |
