# AGENTS.md

This file explains how coding agents should work with this repository.

## Project summary

- Package: `strapi-plugin-cloudflare-r2-assets`
- Purpose: Strapi 5 upload provider + plugin integration for Cloudflare R2 storage and Cloudflare edge image resizing URLs.
- Default image formats: `webp`, `avif` (configurable).
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

## Release workflow

Use version scripts for tag-based releases:

```bash
npm run release:patch
# or release:minor / release:major
git push && git push --tags
```

Release invariants:

- `preversion` runs release checks
- `version` force-adds `dist/**` for release commit
- Tags must include required artifacts in commit tree:
  - `dist/provider/index.js`
  - `dist/provider/index.mjs`
  - `dist/server/index.js`
  - `dist/admin/index.js`

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
        formats: ['webp', 'avif'],
        quality: 82,
        maxFormats: 4,
      },
    },
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
- `CF_IMAGE_FORMATS`
- `CF_IMAGE_QUALITY`
- `CF_IMAGE_MAX_FORMATS`
- `CF_R2_CACHE_CONTROL`
- `CF_R2_ENV_PREFIX`

### Prefix support (`envPrefix`)

Agents can configure prefixed env resolution in either way:

- Provider config: `providerOptions.envPrefix = 'APP_'`
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
- Default formats must remain `webp` + `avif` unless explicitly changed.
- Run `npm test`, `npm run build`, and `npm run verify` before finalizing.
- Keep docs (`README.md`) aligned with any config/runtime changes.

## Smoke test checklist

1. Upload image in Media Library.
2. Confirm object exists in R2.
3. Confirm `file.url` points to public base URL.
4. Confirm generated format URLs include `/cdn-cgi/image/...`.
5. Delete image and confirm object removal from R2.
