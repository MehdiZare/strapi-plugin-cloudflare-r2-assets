# Changelog

## 0.1.0

Initial release of the Strapi 5 upload provider for Cloudflare R2.

### Features

- Upload provider backed by Cloudflare R2 with S3-compatible API
- Cloudflare edge image resizing URL generation (`/cdn-cgi/image/...`)
- Default image formats: WebP + AVIF (configurable via `CF_IMAGE_FORMATS`)
- Configurable image quality and max formats guard
- Read-only admin diagnostics page under Settings with provider status, effective config, and R2 bucket connectivity check
- Optional `CF_R2_ENV_PREFIX` for multi-tenant or namespaced deployments
- Configurable `Cache-Control` header via `CF_R2_CACHE_CONTROL`
- Three package entry points: provider, server plugin, and admin panel (CJS + ESM)

### Security

- Secrets resolved exclusively from environment variables — never persisted in database
- Path traversal prevention on upload keys
- URL origin validation on delete fallbacks (exact match against `CF_PUBLIC_BASE_URL`)
- Admin diagnostics redact account identity (suffix only) and sanitize error messages
- Diagnostics route gated by explicit plugin read permission (`plugin::cloudflare-r2-assets.read`)
- Strict integer parsing for numeric env options; URL validation for endpoint and base URL

### Developer Experience

- CI pipeline: build, typecheck, test, verify, artifact checks on every push and PR
- Automated prerelease publishing to `next` dist-tag from `dev` branch
- Label-driven release versioning (`release:major` / `release:minor` / `release:patch`)
- Artifact verification script (`check:artifacts`) ensures all 6 dist files are present
- Pre-push Git hook runs production dependency audit
- Comprehensive test suite covering config resolution, path handling, URL building, provider lifecycle, routes, and status

