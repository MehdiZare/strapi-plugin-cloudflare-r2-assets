# strapi-plugin-cloudflare-r2-assets

[![npm version](https://img.shields.io/npm/v/strapi-plugin-cloudflare-r2-assets)](https://www.npmjs.com/package/strapi-plugin-cloudflare-r2-assets)
[![CI](https://github.com/MehdiZare/strapi-plugin-cloudflare-r2-assets/actions/workflows/ci.yml/badge.svg)](https://github.com/MehdiZare/strapi-plugin-cloudflare-r2-assets/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Strapi 5 plugin + upload provider that stores assets in Cloudflare R2 and generates Cloudflare edge image resizing URLs.

## Guides

- [`LLM.md`](./LLM.md): usage and integration guide (install/configure/run in a Strapi app)
- [`AGENTS.md`](./AGENTS.md): contributor guide for coding agents working on this repository

## Features

- Upload provider for Strapi Upload plugin backed by Cloudflare R2
- Default image format policy: `webp` + `avif`
- Configurable format list and max formats guard
- Read-only Strapi admin settings page with diagnostics:
  - provider activation
  - non-secret effective config
  - R2 bucket connectivity check
- Secrets are env-only (never persisted in database)

## Requirements

- Node.js 20, 22, or 24 (Node 21 is not supported)
- Strapi 5.37.1 or newer
- Cloudflare R2 bucket
- Cloudflare proxied public domain for image delivery (`/cdn-cgi/image/...`)

## Installation

```bash
npm install strapi-plugin-cloudflare-r2-assets
```

## Cloudflare setup

1. Create an R2 bucket.
2. Create an R2 API token with least privilege for the bucket.
3. Configure a public domain (proxied through Cloudflare) that points to your bucket assets.
4. Ensure Cloudflare Image Resizing is enabled for your zone.

## Environment variables

Required:

- `CF_R2_ACCOUNT_ID`
- `CF_R2_BUCKET`
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`
- `CF_PUBLIC_BASE_URL` (e.g. `https://media.example.com`)

Optional:

- `CF_R2_ENDPOINT` (defaults to `https://<accountId>.r2.cloudflarestorage.com`)
- `CF_R2_BASE_PATH` (default: `uploads`)
- `CF_IMAGE_FORMATS` (comma separated, default: `webp,avif`)
- `CF_IMAGE_QUALITY` (default: `82`)
- `CF_IMAGE_MAX_FORMATS` (default: `4`)
- `CF_R2_CACHE_CONTROL` (e.g. `public, max-age=31536000, immutable`)
- `CF_R2_ENV_PREFIX` (optional prefix for env keys, e.g. `APP_` to read `APP_CF_R2_ACCOUNT_ID`, etc.)

## Strapi configuration

`config/plugins.ts`:

```ts
export default () => ({
  upload: {
    config: {
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions: {
        envPrefix: 'APP_',
        basePath: 'uploads',
        formats: ['webp', 'avif'],
        quality: 82,
        maxFormats: 4
      }
    }
  }
});
```

With `envPrefix: 'APP_'`, the plugin resolves values from prefixed keys first (`APP_CF_R2_ACCOUNT_ID`, `APP_CF_R2_BUCKET`, ...), then falls back to unprefixed keys if missing.

## Admin page

After installation, open:

- `Settings -> Cloudflare R2 Assets`

The page is read-only and does not expose secrets.

Access to diagnostics requires the plugin read permission action:

- `plugin::cloudflare-r2-assets.read`

## Development commands

```bash
npm run watch
npm run watch:link
npm run build
npm run verify
npm test
```

## Release process

This repository uses a `dev -> main` release model with label-driven versioning.

### 1. Create release intent on the automated release PR

- `release-pr.yml` keeps an open PR from `dev` to `main`.
- Add exactly one label to that PR:
  - `release:major`
  - `release:minor`
  - `release:patch`

### 2. Prerelease lane (`next`)

- `dev-release.yml` runs on pushes to `dev`.
- It reads the release label from the open `dev -> main` PR.
- It publishes a prerelease to npm using dist-tag `next`.

Install prerelease for validation:

```bash
npm i strapi-plugin-cloudflare-r2-assets@next
```

### 3. Stable release lane (`latest`)

When ready for production:

```bash
npm run release:patch
# or: npm run release:minor
# or: npm run release:major
git push && git push --tags
```

`release.yml` runs on `v*` tags and:

- validates build/test/verify/artifact checks
- verifies required dist artifacts exist in the tag commit
- publishes to npm (`latest`)
- uploads `.tgz` and `dist.tar.gz` to GitHub Release assets

Required release artifacts:

- `dist/provider/index.js`
- `dist/provider/index.mjs`
- `dist/server/index.js`
- `dist/server/index.mjs`
- `dist/admin/index.js`
- `dist/admin/index.mjs`

## Security defaults

- API keys read only from environment variables
- No credential persistence
- Config validation fails fast
- Numeric env options are strict integers (`CF_IMAGE_QUALITY`, `CF_IMAGE_MAX_FORMATS`)
- `CF_PUBLIC_BASE_URL` and `CF_R2_ENDPOINT` must be valid `http(s)` URLs
- Admin diagnostics redact account identity (suffix only)
- Admin diagnostics route is gated by explicit plugin read permission
- Bucket-check errors are sanitized before being returned to the admin UI
- URL-derived delete fallbacks require exact origin match with `CF_PUBLIC_BASE_URL`

## CI security audit policy

- Blocking audit scope is runtime-only: `npm audit --omit=dev --omit=peer --omit=optional --audit-level=high`
- A separate full-graph audit runs in CI for visibility and does not block releases
- This keeps package release gating aligned with shipped runtime risk for this plugin package

## Upstream advisory: Strapi Koa dependency

Strapi `5.37.1` currently resolves Koa below the patched version for `GHSA-7gcc-r8m5-44qm` / `CVE-2026-27959`.

Until Strapi publishes a fixed release, add an app-level override in your Strapi project:

```json
{
  "overrides": {
    "koa": ">=2.16.4"
  }
}
```

Then reinstall dependencies and redeploy.

## License

MIT
