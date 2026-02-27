# strapi-plugin-cloudflare-r2-assets

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
- Strapi 5
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

## Development commands

```bash
npm run watch
npm run watch:link
npm run build
npm run verify
npm test
```

## Security defaults

- API keys read only from environment variables
- No credential persistence
- Config validation fails fast
- Admin diagnostics redact account identity (suffix only)

## License

MIT
