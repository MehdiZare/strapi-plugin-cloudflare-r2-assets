/**
 * E2E tests that spin up a full Strapi 5 instance with the R2 upload provider.
 *
 * Skipped unless all required env vars are set:
 *   CF_R2_ACCOUNT_ID, CF_R2_BUCKET, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, CF_PUBLIC_BASE_URL
 *
 * The plugin dist must be built before running (`npm run build`).
 *
 * Setup:
 *   cp .env.test.example .env.test   # then fill in credentials
 *   npm run build && npm test
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

const hasR2Credentials = !!(
  process.env.CF_R2_ACCOUNT_ID &&
  process.env.CF_R2_BUCKET &&
  process.env.CF_R2_ACCESS_KEY_ID &&
  process.env.CF_R2_SECRET_ACCESS_KEY &&
  process.env.CF_PUBLIC_BASE_URL
);

const hasBuiltDist = existsSync(join(PROJECT_ROOT, 'dist', 'provider', 'index.js'));
const LOGO_PATH = join(PROJECT_ROOT, 'marketplace-logo.png');
const hasLogoFile = existsSync(LOGO_PATH);

/** Project logo used as a real-world image upload test (~580 KB). Loaded lazily in beforeAll. */
let logoPng: Uint8Array<ArrayBuffer>;

// ── Helpers ──────────────────────────────────────────────────────────

/** POST multipart upload to Strapi admin API. */
const uploadFile = async (
  baseUrl: string,
  jwt: string,
  blob: Blob,
  filename: string,
): Promise<Response> => {
  const form = new FormData();
  form.append('files', blob, filename);
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
};

/** GET a single uploaded file by ID. */
const getFile = (baseUrl: string, jwt: string, id: number): Promise<Response> =>
  fetch(`${baseUrl}/upload/files/${id}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

/** DELETE an uploaded file by ID. */
const deleteFile = (baseUrl: string, jwt: string, id: number): Promise<Response> =>
  fetch(`${baseUrl}/upload/files/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt}` },
  });

// ── Suite ────────────────────────────────────────────────────────────

describe.skipIf(!hasR2Credentials || !hasBuiltDist || !hasLogoFile)(
  'E2E: Strapi with R2 provider',
  () => {
    let tmpDir: string;
    let strapi: any;
    let baseUrl: string;
    let adminJwt: string;
    const uploadedFileIds: number[] = [];
    const uploadedPublicUrls: string[] = [];
    const basePath = `__e2e-test/${Date.now()}`;

    // Self-symlink so require('strapi-plugin-cloudflare-r2-assets') resolves
    // from anywhere inside node_modules (Strapi's upload plugin uses require).
    const selfLink = join(PROJECT_ROOT, 'node_modules', 'strapi-plugin-cloudflare-r2-assets');
    const createdSelfLink = !existsSync(selfLink);

    // ── Setup ──────────────────────────────────────────────────────

    beforeAll(async () => {
      logoPng = readFileSync(LOGO_PATH);

      // Make our package resolvable by name from the project's node_modules
      if (createdSelfLink) {
        await symlink(PROJECT_ROOT, selfLink);
      }

      tmpDir = await mkdtemp(join(tmpdir(), 'strapi-r2-e2e-'));

      // Directory structure required by Strapi getDirs
      await Promise.all([
        mkdir(join(tmpDir, 'config'), { recursive: true }),
        mkdir(join(tmpDir, 'src', 'admin'), { recursive: true }),
        mkdir(join(tmpDir, 'src', 'api'), { recursive: true }),
        mkdir(join(tmpDir, 'public'), { recursive: true }),
        mkdir(join(tmpDir, '.tmp'), { recursive: true }),
      ]);

      // ── Config files ────────────────────────────────────────────

      const dbPath = join(tmpDir, '.tmp', 'data.db').replace(/\\/g, '/');

      await Promise.all([
        writeFile(
          join(tmpDir, 'package.json'),
          JSON.stringify({
            name: 'strapi-r2-e2e-app',
            private: true,
            version: '0.0.0',
            dependencies: { 'strapi-plugin-cloudflare-r2-assets': '0.0.0' },
          }),
        ),

        writeFile(
          join(tmpDir, 'config', 'database.js'),
          [
            'module.exports = () => ({',
            '  connection: {',
            "    client: 'sqlite',",
            `    connection: { filename: ${JSON.stringify(dbPath)} },`,
            '    useNullAsDefault: true,',
            '  },',
            '});',
          ].join('\n'),
        ),

        writeFile(
          join(tmpDir, 'config', 'server.js'),
          [
            'module.exports = () => ({',
            "  host: '127.0.0.1',",
            '  port: 0,',
            "  app: { keys: ['e2e-test-key-a', 'e2e-test-key-b'] },",
            '});',
          ].join('\n'),
        ),

        writeFile(
          join(tmpDir, 'config', 'plugins.js'),
          [
            'module.exports = () => ({',
            '  upload: {',
            '    config: {',
            "      provider: 'strapi-plugin-cloudflare-r2-assets',",
            '      providerOptions: {',
            `        basePath: ${JSON.stringify(basePath)},`,
            '      },',
            '    },',
            '  },',
            '});',
          ].join('\n'),
        ),

        writeFile(
          join(tmpDir, 'config', 'middlewares.js'),
          [
            'module.exports = [',
            "  'strapi::logger',",
            "  'strapi::errors',",
            "  'strapi::security',",
            "  'strapi::cors',",
            "  'strapi::poweredBy',",
            "  'strapi::query',",
            "  'strapi::body',",
            "  'strapi::session',",
            "  'strapi::favicon',",
            "  'strapi::public',",
            '];',
          ].join('\n'),
        ),

        writeFile(
          join(tmpDir, 'config', 'admin.js'),
          [
            'module.exports = () => ({',
            "  auth: { secret: 'e2e-test-jwt-secret-that-is-at-least-32-chars-long!!' },",
            "  apiToken: { salt: 'e2e-test-api-token-salt-value-here!!' },",
            "  transfer: { token: { salt: 'e2e-test-transfer-token-salt-here!!' } },",
            '  serveAdminPanel: false,',
            '});',
          ].join('\n'),
        ),
      ]);

      // ── Start Strapi ────────────────────────────────────────────
      // Use CJS require to avoid Strapi's lodash/fp ESM directory-import issue.
      const cjsRequire = createRequire(import.meta.url);
      const { createStrapi: factory } = cjsRequire('@strapi/strapi');
      strapi = await factory({
        appDir: tmpDir,
        distDir: tmpDir,
        autoReload: false,
        serveAdminPanel: false,
      }).load();
      await strapi.listen();

      const addr = strapi.server.httpServer.address();
      const port = typeof addr === 'object' && addr ? addr.port : addr;
      baseUrl = `http://127.0.0.1:${port}`;

      // ── Register first admin user ───────────────────────────────

      const res = await fetch(`${baseUrl}/admin/register-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname: 'E2E',
          lastname: 'Test',
          email: 'e2e@test.local',
          password: 'Test1234!',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Admin registration failed (${res.status}): ${text}`);
      }

      const body = (await res.json()) as { data: { token: string } };
      adminJwt = body.data.token;
    }, 120_000);

    // ── Teardown ─────────────────────────────────────────────────

    afterAll(async () => {
      if (strapi) {
        // Strapi's destroy() calls process.removeAllListeners() which strips
        // vitest's IPC listeners and causes an EPIPE. Temporarily prevent that.
        const orig = process.removeAllListeners;
        process.removeAllListeners = (() => process) as typeof orig;
        try {
          await strapi.destroy();
        } finally {
          process.removeAllListeners = orig;
        }
      }
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true });
      }
      if (createdSelfLink) {
        await rm(selfLink, { force: true });
      }
    }, 30_000);

    // ── Tests ────────────────────────────────────────────────────

    it('uploads a text file', async () => {
      const blob = new Blob(['e2e-test-content'], { type: 'text/plain' });
      const res = await uploadFile(baseUrl, adminJwt, blob, 'e2e-test.txt');

      expect(res.status).toBe(201);

      const files = (await res.json()) as Array<{
        id: number;
        url: string;
        provider: string;
        provider_metadata: { bucket: string; key: string };
      }>;
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.url).toBeTruthy();
      expect(file.provider).toBe('strapi-plugin-cloudflare-r2-assets');
      expect(file.provider_metadata).toMatchObject({
        bucket: process.env.CF_R2_BUCKET,
        key: expect.stringContaining(basePath),
      });

      uploadedFileIds.push(file.id);
      uploadedPublicUrls.push(file.url);
    }, 30_000);

    it('uploaded file is publicly accessible via R2', async () => {
      expect(uploadedPublicUrls.length).toBeGreaterThan(0);

      const res = await fetch(uploadedPublicUrls[0]);
      expect(res.status).toBe(200);

      const body = await res.text();
      expect(body).toBe('e2e-test-content');
    }, 30_000);

    it('retrieves file metadata with correct provider and URL', async () => {
      expect(uploadedFileIds.length).toBeGreaterThan(0);

      const res = await getFile(baseUrl, adminJwt, uploadedFileIds[0]);
      expect(res.status).toBe(200);

      const file = (await res.json()) as {
        id: number;
        url: string;
        provider: string;
      };
      expect(file.provider).toBe('strapi-plugin-cloudflare-r2-assets');
      expect(file.url).toContain(process.env.CF_PUBLIC_BASE_URL);
    }, 30_000);

    it('uploads an image and generates responsive format variants', async () => {
      const blob = new Blob([logoPng], { type: 'image/png' });
      const res = await uploadFile(baseUrl, adminJwt, blob, 'e2e-test.png');

      expect(res.status).toBe(201);

      const files = (await res.json()) as Array<{
        id: number;
        url: string;
        formats?: Record<string, { url: string }> | null;
      }>;
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.url).toBeTruthy();

      // Strapi generates responsive variants (thumbnail, small, etc.) and uploads
      // each separately. Verify format URLs point to the R2 public bucket.
      if (file.formats && Object.keys(file.formats).length > 0) {
        const formatUrls = Object.values(file.formats).map((f) => f.url);
        for (const url of formatUrls) {
          expect(url).toContain(process.env.CF_PUBLIC_BASE_URL!);
          expect(url).toContain(basePath);
        }
      }

      uploadedFileIds.push(file.id);
      uploadedPublicUrls.push(file.url);
    }, 30_000);

    it('deletes uploaded files', async () => {
      expect(uploadedFileIds.length).toBeGreaterThan(0);

      for (const id of uploadedFileIds) {
        const res = await deleteFile(baseUrl, adminJwt, id);
        expect(res.status).toBe(200);
      }
    }, 30_000);

    it('confirms deleted files return 404 from Strapi', async () => {
      for (const id of uploadedFileIds) {
        const res = await getFile(baseUrl, adminJwt, id);
        expect(res.status).toBe(404);
      }
    }, 30_000);

    it('confirms deleted files are removed from R2', async () => {
      expect(uploadedPublicUrls.length).toBeGreaterThan(0);

      for (const url of uploadedPublicUrls) {
        const res = await fetch(url);
        expect(res.status).toBe(404);
      }
    }, 30_000);

    it('reports healthy status from plugin endpoint', async () => {
      const res = await fetch(
        `${baseUrl}/cloudflare-r2-assets/settings/status`,
        { headers: { Authorization: `Bearer ${adminJwt}` } },
      );

      expect(res.status).toBe(200);

      const status = (await res.json()) as {
        activeProvider: boolean;
        configured: boolean;
        health: { bucketReachable: boolean };
      };
      expect(status.activeProvider).toBe(true);
      expect(status.configured).toBe(true);
      expect(status.health.bucketReachable).toBe(true);
    }, 30_000);
  },
  180_000,
);
