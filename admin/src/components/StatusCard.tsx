import type { JSX, PropsWithChildren } from 'react';

type Tone = 'ok' | 'warning' | 'error';

const colorByTone: Record<Tone, string> = {
  ok: '#2f8f46',
  warning: '#a96800',
  error: '#b42318',
};

type StatusCardProps = PropsWithChildren<{
  title: string;
  tone: Tone;
  subtitle?: string;
}>;

const StatusCard = ({ title, tone, subtitle, children }: StatusCardProps): JSX.Element => {
  return (
    <div
      style={{
        border: `1px solid ${colorByTone[tone]}33`,
        borderRadius: '8px',
        padding: '14px 16px',
        background: '#fff',
      }}
    >
      <h3 style={{ margin: 0, color: colorByTone[tone], fontSize: '14px' }}>{title}</h3>
      {subtitle ? <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>{subtitle}</p> : null}
      {children ? <div style={{ marginTop: '10px' }}>{children}</div> : null}
    </div>
  );
};

export default StatusCard;

