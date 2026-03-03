# AGENTS.md

This file explains how coding agents should work with this repository.

## Project summary

- Package: `strapi-plugin-cloudflare-r2-assets`
- Purpose: Strapi 5 upload provider + plugin integration for Cloudflare R2 storage.
- Secret handling: environment variables only (no DB persistence).

## Runtime and toolchain

- Runtime compatibility target: Node `20`, `22`, `24`
- Do **not** use Node `21` (upstream deps warn on 21).
- Contributor note: `@strapi/sdk-plugin@6.0.1` is officially `<=22`, so local plugin dev is cleanest on Node `22`.

## Repo commands

```bash
npm install
npm test
npm run build
npm run verify
npm run check:artifacts
```

For local plugin development:

```bash
npm run watch
npm run watch:link
```

## Git hooks

The repo uses `core.hooksPath` pointing to `.githooks/`. Hooks are configured
automatically by `npm install` (via the `prepare` script).

| Hook       | Purpose                                       |
|------------|-----------------------------------------------|
| `pre-push` | Audit production deps for high+ vulnerabilities |

Bypass (emergency only): `git push --no-verify`

Manual run: `npm run audit:check`

## Release workflow

Release automation follows a `dev -> main` flow with label-driven versioning.

Prerelease lane:

- `dev-release.yml` runs on `dev`
- reads release type from labels on open `dev -> main` PR:
  - `release:major`
  - `release:minor`
  - `release:patch`
- publishes prerelease package to npm `next`

Stable lane (label-driven):

1. Create a PR from `dev` to `main`
2. Apply exactly one release label: `release:patch`, `release:minor`, or `release:major`
3. CI validates the PR (build, test, typecheck across Node 20/22/24)
4. Review and merge the PR
5. `release-prepare.yml` detects the label, bumps version, builds `dist/`, and opens a `release/vX.Y.Z` branch PR to main
6. CI runs on the release PR; auto-merge is enabled so it merges when checks pass
7. `release-publish.yml` detects the release PR merge, tags, publishes to npm `latest`, and creates a GitHub release

Release invariants:

- Tests are NOT re-run at publish time — CI already validated on the PR
- Tags must include required artifacts in commit tree:
  - `dist/provider/index.js`
  - `dist/provider/index.mjs`
  - `dist/server/index.js`
  - `dist/server/index.mjs`
  - `dist/admin/index.js`
  - `dist/admin/index.mjs`

## How to use in a Strapi app (local link)

1. In this repo:

```bash
npm run watch:link
```

2. In target Strapi app:

```bash
npx yalc add --link strapi-plugin-cloudflare-r2-assets
npm install
```

3. Configure upload provider in `config/plugins.ts`:

```ts
export default () => ({
  upload: {
    config: {
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions: {
        basePath: 'uploads',
      },
    },
  },
  'cloudflare-r2-assets': {
    enabled: true,
  },
});
```

## Environment variables

Required:

- `CF_R2_ACCOUNT_ID`
- `CF_R2_BUCKET`
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`
- `CF_PUBLIC_BASE_URL`

Optional:

- `CF_R2_ENDPOINT`
- `CF_R2_BASE_PATH`
- `CF_R2_CACHE_CONTROL`
- `CF_R2_ENV_PREFIX`

### Prefix support

Prefixed env resolution is configured via environment variable only:

- Env var: `CF_R2_ENV_PREFIX=APP_`

Resolution order:

1. Prefixed key (e.g. `APP_CF_R2_BUCKET`)
2. Fallback to unprefixed key (e.g. `CF_R2_BUCKET`)

## Admin diagnostics page

- Route in Strapi admin: `Settings -> Cloudflare R2 Assets`
- Purpose: read-only status for:
  - active provider check
  - effective non-secret config
  - bucket connectivity

Never add secret display on this page.

## Important file map

- Provider entry: `src/provider/index.ts`
- Config/env parsing: `src/shared/config.ts`
- URL building: `src/shared/url-builder.ts`
- Path/object key helpers: `src/shared/path.ts`
- Server status service: `server/src/services/status.ts`
- Admin entry: `admin/src/index.ts`
- Admin status page: `admin/src/pages/SettingsStatusPage.tsx`
- Tests: `tests/*.test.ts`

## Contribution guardrails for agents

- Keep env-only secret model intact.
- Preserve backward compatibility for existing unprefixed env vars.
- Run `npm test`, `npm run build`, and `npm run verify` before finalizing.
- Keep docs (`README.md`) aligned with any config/runtime changes.

## Smoke test checklist

1. Upload image in Media Library.
2. Confirm object exists in R2.
3. Confirm `file.url` points to public base URL.
4. Delete image and confirm object removal from R2.
