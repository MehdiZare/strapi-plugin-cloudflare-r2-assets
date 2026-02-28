import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Box, Divider, Flex, Loader, Typography } from '@strapi/design-system';
import { Layouts, Page, useFetchClient } from '@strapi/strapi/admin';

import pluginId from '../pluginId';
import type { SettingsStatusResponse } from '../../../src/shared/types';
import StatusCard from '../components/StatusCard';
import CodeBlock from '../components/CodeBlock';
import EnvKeyList from '../components/EnvKeyList';

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SettingsStatusResponse };

const endpoint = `/${pluginId}/settings/status`;
const title = 'Cloudflare R2 Assets';

const formatConfigValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (value === null || typeof value === 'undefined') {
    return '\u2014';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const pluginSetupSnippet = `// config/plugins.ts
export default () => ({
  upload: {
    config: {
      provider: "strapi-plugin-cloudflare-r2-assets",
      providerOptions: {},
    },
  },
});`;

const SettingsStatusPage = (): JSX.Element => {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const { get } = useFetchClient();

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const { data } = await get<SettingsStatusResponse>(endpoint, {
          signal: controller.signal,
        });
        setState({ status: 'success', data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [get]);

  return (
    <>
      <Page.Title>{title}</Page.Title>
      <Page.Main>
        <Layouts.Header title={title} subtitle="Read-only diagnostics for provider configuration and bucket connectivity." />
        <Layouts.Content>
          {state.status === 'loading' ? (
            <Flex direction="column" gap={3} alignItems="center" justifyContent="center" padding={8}>
              <Loader />
              <Typography variant="pi" textColor="neutral600">
                Loading status...
              </Typography>
            </Flex>
          ) : null}

          {state.status === 'error' ? (
            <Alert
              closeLabel="Close alert"
              title="Failed to load diagnostics"
              variant="danger"
            >
              {state.error}
            </Alert>
          ) : null}

          {state.status === 'success' ? (
            <Flex direction="column" alignItems="stretch" gap={4}>
              {/* Section 1: Upload Provider */}
              {state.data.activeProvider ? (
                <StatusCard
                  tone="ok"
                  title="Upload Provider"
                  subtitle={`Active provider: ${state.data.providerName ?? 'unknown'}`}
                />
              ) : (
                <StatusCard
                  tone="error"
                  title="Upload Provider"
                  subtitle="The Cloudflare R2 upload provider is not active."
                >
                  <Flex direction="column" gap={3}>
                    <Typography variant="pi" textColor="neutral700">
                      To activate, configure the upload provider in your Strapi project:
                    </Typography>
                    <CodeBlock>{pluginSetupSnippet}</CodeBlock>
                    <Typography variant="pi" textColor="neutral600">
                      Then restart Strapi.
                    </Typography>
                  </Flex>
                </StatusCard>
              )}

              {/* Section 2: Environment Variables (only when provider active) */}
              {state.data.activeProvider && state.data.envKeys ? (
                <StatusCard
                  tone={
                    state.data.envKeys.filter((k) => k.required).every((k) => k.resolved)
                      ? 'ok'
                      : 'error'
                  }
                  title="Environment Variables"
                  subtitle={
                    state.data.envKeys.filter((k) => k.required).every((k) => k.resolved)
                      ? 'All required environment variables are set.'
                      : 'Some required environment variables are missing.'
                  }
                >
                  <Flex direction="column" gap={3}>
                    <EnvKeyList envKeys={state.data.envKeys} />
                    {!state.data.envKeys.some((k) => k.prefixedKey) ? (
                      <Box paddingTop={2}>
                        <Typography variant="pi" textColor="neutral600">
                          If your env vars use a custom prefix (e.g. CMS_), set CF_R2_ENV_PREFIX in your .env file.
                        </Typography>
                      </Box>
                    ) : null}
                    {state.data.envKeys.filter((k) => k.required).some((k) => !k.resolved) ? (
                      <Typography variant="pi" textColor="neutral600">
                        After setting missing variables, restart Strapi.
                      </Typography>
                    ) : null}
                  </Flex>
                </StatusCard>
              ) : null}

              {/* Section 3: Effective Configuration (only when configured) */}
              {state.data.config ? (
                <StatusCard tone="ok" title="Effective Configuration">
                  <Flex direction="column" gap={3}>
                    {Object.entries(state.data.config).map(([key, value], index, all) => (
                      <Box key={key}>
                        <Flex direction="column" gap={1}>
                          <Typography variant="pi" textColor="neutral600">
                            {key}
                          </Typography>
                          <Typography variant="pi" fontWeight="semiBold" textColor="neutral800">
                            {formatConfigValue(value)}
                          </Typography>
                        </Flex>
                        {index < all.length - 1 ? <Divider marginTop={2} /> : null}
                      </Box>
                    ))}
                  </Flex>
                </StatusCard>
              ) : null}

              {/* Section 4: Bucket Connectivity (only when health data present) */}
              {state.data.health ? (
                <StatusCard
                  tone={state.data.health.ok ? 'ok' : 'error'}
                  title="Bucket Connectivity"
                  subtitle={state.data.health.detail ?? 'No bucket check was executed.'}
                >
                  {!state.data.health.ok ? (
                    <Flex direction="column" gap={2}>
                      <Typography variant="pi" textColor="neutral700" fontWeight="semiBold">
                        Troubleshooting steps:
                      </Typography>
                      <Typography variant="pi" textColor="neutral700" tag="ol" style={{ paddingLeft: '20px', margin: 0 }}>
                        <li>
                          Verify that the bucket{' '}
                          <Typography variant="pi" fontWeight="semiBold" tag="span">
                            {state.data.config?.bucket ?? '(unknown)'}
                          </Typography>{' '}
                          exists in your Cloudflare R2 dashboard.
                        </li>
                        <li>
                          Confirm the endpoint{' '}
                          <Typography variant="pi" fontWeight="semiBold" tag="span">
                            {state.data.config?.endpoint ?? '(unknown)'}
                          </Typography>{' '}
                          is correct for your account.
                        </li>
                        <li>Check that your R2 API token has read/write permissions for the bucket.</li>
                        <li>Ensure the access key ID and secret access key are valid and not revoked.</li>
                      </Typography>
                    </Flex>
                  ) : null}
                </StatusCard>
              ) : null}

              {/* Warnings */}
              {state.data.warnings.length > 0 ? (
                <Flex direction="column" gap={2}>
                  {state.data.warnings.map((warning) => (
                    <Alert
                      key={warning}
                      closeLabel="Close alert"
                      title="Warning"
                      variant="warning"
                    >
                      {warning}
                    </Alert>
                  ))}
                </Flex>
              ) : null}

              {/* Errors */}
              {state.data.errors.length > 0 ? (
                <Flex direction="column" gap={2}>
                  {state.data.errors.map((error) => (
                    <Alert
                      key={error}
                      closeLabel="Close alert"
                      title="Configuration Error"
                      variant="danger"
                    >
                      {error}
                    </Alert>
                  ))}
                </Flex>
              ) : null}
            </Flex>
          ) : null}
        </Layouts.Content>
      </Page.Main>
    </>
  );
};

export default SettingsStatusPage;
