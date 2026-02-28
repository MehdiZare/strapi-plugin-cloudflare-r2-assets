import type { JSX, PropsWithChildren } from 'react';
import { Card, CardBody, CardHeader, Flex, Status, Typography } from '@strapi/design-system';

type Tone = 'ok' | 'warning' | 'error';

const statusVariantByTone: Record<Tone, 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  warning: 'warning',
  error: 'danger',
};

const statusTextByTone: Record<Tone, string> = {
  ok: 'Healthy',
  warning: 'Check',
  error: 'Issue',
};

type StatusCardProps = PropsWithChildren<{
  title: string;
  tone: Tone;
  subtitle?: string;
}>;

const StatusCard = ({ title, tone, subtitle, children }: StatusCardProps): JSX.Element => {
  return (
    <Card>
      <CardHeader direction="column" alignItems="stretch" gap={2} padding={4}>
        <Flex justifyContent="space-between" alignItems="center" gap={3}>
          <Typography variant="omega" tag="h3">
            {title}
          </Typography>
          <Status variant={statusVariantByTone[tone]} size="S">
            {statusTextByTone[tone]}
          </Status>
        </Flex>
        {subtitle ? (
          <Typography variant="pi" textColor="neutral600">
            {subtitle}
          </Typography>
        ) : null}
      </CardHeader>
      {children ? <CardBody padding={4} paddingTop={0}>{children}</CardBody> : null}
    </Card>
  );
};

export default StatusCard;
