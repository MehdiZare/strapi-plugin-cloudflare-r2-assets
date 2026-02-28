# LLM.md

This guide is for LLM assistants and users who want to integrate `strapi-plugin-cloudflare-r2-assets` into a Strapi app.

Use this for **installation and runtime usage**.  
Use `AGENTS.md` for repository contribution workflows.

## Goal

Configure Strapi Upload to:

1. Store original files in Cloudflare R2
2. Return Cloudflare edge image resizing URLs
3. Default to `webp` + `avif` for image format variants

## Prerequisites

- Strapi 5 app
- Node 20, 22, or 24
- Cloudflare R2 bucket
- Cloudflare-proxied public domain for media delivery
- Cloudflare Image Resizing enabled

## Install

```bash
npm install strapi-plugin-cloudflare-r2-assets
```

## Configure Strapi

In `config/plugins.ts`:

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

## Required env vars

Set these in your Strapi `.env`:

- `CF_R2_ACCOUNT_ID`
- `CF_R2_BUCKET`
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`
- `CF_PUBLIC_BASE_URL` (example: `https://media.example.com`)

Optional:

- `CF_R2_ENDPOINT`
- `CF_R2_BASE_PATH`
- `CF_IMAGE_FORMATS`
- `CF_IMAGE_QUALITY`
- `CF_IMAGE_MAX_FORMATS`
- `CF_R2_CACHE_CONTROL`
- `CF_R2_ENV_PREFIX`

## Env prefix mode

You can namespace env vars with `CF_R2_ENV_PREFIX`.

Example:

```bash
CF_R2_ENV_PREFIX=APP_
```

Then the plugin checks prefixed keys first:

- `APP_CF_R2_ACCOUNT_ID`
- `APP_CF_R2_BUCKET`
- `APP_CF_R2_ACCESS_KEY_ID`
- `APP_CF_R2_SECRET_ACCESS_KEY`
- `APP_CF_PUBLIC_BASE_URL`

Fallback behavior:

1. Read prefixed key if present
2. Fall back to unprefixed key if missing

## Run and verify

1. Restart Strapi:

```bash
npm run develop
```

2. Open admin page:

- `Settings -> Cloudflare R2 Assets`

3. Check status:

- Upload provider is active
- Configuration is valid
- Bucket connectivity is healthy

4. Upload an image in Media Library and verify:

- Object exists in R2
- `file.url` uses `CF_PUBLIC_BASE_URL`
- format URLs include `/cdn-cgi/image/...`

5. Delete image and confirm object is removed from R2

## Common mistakes

- Using Node 21 (unsupported by some upstream dependencies)
- Forgetting to proxy `CF_PUBLIC_BASE_URL` through Cloudflare
- Missing required env vars
- Setting provider name incorrectly in `config/plugins.ts`

## Release commands

This repo has two release lanes:

1. **Prerelease lane (`next`)**
- Triggered by pushes to `dev` via `dev-release.yml`
- Release type comes from label on the open `dev -> main` release PR:
  - `release:major`
  - `release:minor`
  - `release:patch`
- Publishes prerelease package to npm with tag `next`

Install prerelease:

```bash
npm i strapi-plugin-cloudflare-r2-assets@next
```

2. **Stable lane (`latest`)**
- Triggered by `v*` tags via `release.yml`
- Publishes stable package to npm `latest`

To cut stable tags locally:

```bash
npm run release:patch
# or release:minor / release:major
git push && git push --tags
```

Both lanes validate build/test/verify and artifact checks before publish.

## Supply-chain alerts

Supply-chain scanners (e.g. Socket.dev) may report high alerts against this plugin. All current alerts originate from upstream Strapi peer/dev dependencies — not from this plugin's sole production dependency (`@aws-sdk/client-s3`).

Known alerts and mitigations:

- **CVE-2026-27959** (`koa`) and **CVE-2026-27903** (`minimatch`): Strapi `5.37.1` pins versions below the patched releases. Add `"koa": ">=2.16.4"` and `"minimatch": ">=10.2.3"` to your Strapi project's `overrides` in `package.json`, then reinstall.
- **Obfuscated code** (`entities`, `vite`): False positives on generated lookup tables and bundled dist files. No action needed.

These alerts will clear when Strapi releases an update with patched transitive dependencies.

## Minimal troubleshooting prompt for LLMs

When debugging an integration issue, ask for:

1. `config/plugins.ts` upload provider block
2. Relevant env var names (mask secrets)
3. Output from `Settings -> Cloudflare R2 Assets`
4. One uploaded file response payload (`url`, `formats`, `provider_metadata`)
