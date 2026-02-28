import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useFetchClient } from '@strapi/admin/strapi-admin';

import pluginId from '../pluginId';
import type { SettingsStatusResponse } from '../../../src/shared/types';
import StatusCard from '../components/StatusCard';

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SettingsStatusResponse };

const endpoint = `/${pluginId}/settings/status`;

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

  const title = useMemo(() => 'Cloudflare R2 Assets', []);

  return (
    <main style={{ margin: '28px auto', maxWidth: '980px', padding: '0 20px' }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p style={{ marginTop: '8px', color: '#555' }}>Read-only diagnostics for provider configuration and connectivity.</p>

      {state.status === 'loading' ? <p>Loading status...</p> : null}
      {state.status === 'error' ? <p style={{ color: '#b42318' }}>Failed to load status: {state.error}</p> : null}

      {state.status === 'success' ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          <StatusCard
            tone={state.data.activeProvider ? 'ok' : 'warning'}
            title="Upload provider activation"
            subtitle={
              state.data.activeProvider
                ? `Active provider: ${state.data.providerName ?? 'unknown'}`
                : `Provider is not active. Current: ${state.data.providerName ?? 'none'}`
            }
          />

          <StatusCard
            tone={state.data.configured ? 'ok' : 'error'}
            title="Configuration"
            subtitle={state.data.configured ? 'Required env vars are present.' : 'Required configuration is incomplete.'}
          >
            {state.data.config ? (
              <pre style={{ margin: 0, fontSize: '12px', overflowX: 'auto' }}>{JSON.stringify(state.data.config, null, 2)}</pre>
            ) : null}
          </StatusCard>

          <StatusCard
            tone={state.data.health?.ok ? 'ok' : 'warning'}
            title="Bucket connectivity"
            subtitle={state.data.health?.detail ?? 'No bucket check was executed.'}
          />

          {state.data.warnings.length > 0 ? (
            <StatusCard tone="warning" title="Warnings">
              <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
                {state.data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </StatusCard>
          ) : null}

          {state.data.errors.length > 0 ? (
            <StatusCard tone="error" title="Errors">
              <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
                {state.data.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </StatusCard>
          ) : null}
        </div>
      ) : null}
    </main>
  );
};

export default SettingsStatusPage;
