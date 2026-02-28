import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Box, Divider, Flex, Grid, Loader, Typography } from '@strapi/design-system';
import { Layouts, Page, useFetchClient } from '@strapi/strapi/admin';

import pluginId from '../pluginId';
import type { SettingsStatusResponse } from '../../../src/shared/types';
import StatusCard from '../components/StatusCard';

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
    return '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

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
            <Flex direction="column" gap={4}>
              <Grid.Root gap={4}>
                <Grid.Item col={12} s={12} m={4}>
                  <StatusCard
                    tone={state.data.activeProvider ? 'ok' : 'warning'}
                    title="Upload Provider"
                    subtitle={
                      state.data.activeProvider
                        ? `Active provider: ${state.data.providerName ?? 'unknown'}`
                        : `Provider is not active. Current: ${state.data.providerName ?? 'none'}`
                    }
                  />
                </Grid.Item>

                <Grid.Item col={12} s={12} m={4}>
                  <StatusCard
                    tone={state.data.configured ? 'ok' : 'error'}
                    title="Configuration"
                    subtitle={
                      state.data.configured
                        ? 'Required environment values are resolved.'
                        : 'Required configuration is incomplete.'
                    }
                  />
                </Grid.Item>

                <Grid.Item col={12} s={12} m={4}>
                  <StatusCard
                    tone={state.data.health?.ok ? 'ok' : 'warning'}
                    title="Bucket Connectivity"
                    subtitle={state.data.health?.detail ?? 'No bucket check was executed.'}
                  />
                </Grid.Item>
              </Grid.Root>

              {state.data.config ? (
                <StatusCard tone="ok" title="Effective Non-Secret Config">
                  <Flex direction="column" gap={2}>
                    {Object.entries(state.data.config).map(([key, value], index, all) => (
                      <Box key={key}>
                        <Flex justifyContent="space-between" gap={4} wrap="wrap">
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
