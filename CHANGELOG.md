# Changelog

## Unreleased

### Changed

- Replaced `@aws-sdk/client-s3` with lightweight `aws4fetch` — direct HTTP fetch calls to R2 instead of S3 SDK commands, zero transitive production dependencies
- Improved error handling for R2 connectivity and request failures

### Fixed

- `uploadStream()` now buffers streams before uploading — fixes HTTP 411 (MissingContentLength) errors on image uploads through Strapi's processing pipeline
- `PLUGIN_VERSION` constant synced to match `package.json` version
- Provider `.d.ts` types now export proper `ProviderUploadFile` and `RawPluginConfig` types instead of `Record<string, unknown>`
- Added `@strapi/design-system` to `peerDependencies` to prevent admin bundle bloat from bundling the entire library

### Added

- `CF_R2_REQUEST_TIMEOUT` env variable for configuring fetch request timeout in milliseconds (default: 30000)
- E2E test suite: full Strapi 5 instance lifecycle with upload, download verification, delete, and R2 cleanup validation

### Developer Experience

- R2 integration tests refactored to use provider API directly
- Expanded test coverage for timeout and request handling scenarios

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

