# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly using [GitHub's private vulnerability reporting](https://github.com/MehdiZare/strapi-plugin-cloudflare-r2-assets/security/advisories/new).

**Please do not open a public issue for security vulnerabilities.**

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## Upstream Dependency Advisories

This plugin runs inside a Strapi application and inherits parts of Strapi's dependency tree at runtime.

As of February 28, 2026, Strapi `5.37.1` still resolves Koa below the patched version for:

- `GHSA-7gcc-r8m5-44qm`
- `CVE-2026-27959`

Mitigation in consuming Strapi apps until upstream release:

```json
{
  "overrides": {
    "koa": ">=2.16.4"
  }
}
```

After adding the override, reinstall dependencies and redeploy.
