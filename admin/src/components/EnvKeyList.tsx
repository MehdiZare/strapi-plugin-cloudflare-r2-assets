import type { JSX } from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';

import type { EnvKeyInfo } from '../../../src/shared/types';

type EnvKeyListProps = {
  envKeys: EnvKeyInfo[];
};

const StatusIcon = ({ resolved, required }: { resolved: boolean; required: boolean }): JSX.Element => {
  if (!required && !resolved) {
    return (
      <Typography variant="pi" textColor="neutral500" style={{ fontFamily: 'monospace' }}>
        {'—'}
      </Typography>
    );
  }

  return (
    <Typography
      variant="pi"
      textColor={resolved ? 'success600' : 'danger600'}
      style={{ fontFamily: 'monospace' }}
    >
      {resolved ? '\u2713' : '\u2717'}
    </Typography>
  );
};

const EnvKeyRow = ({ info }: { info: EnvKeyInfo }): JSX.Element => {
  return (
    <Flex gap={3} alignItems="flex-start" paddingTop={1} paddingBottom={1}>
      <Box style={{ minWidth: '16px', textAlign: 'center', paddingTop: '1px' }}>
        <StatusIcon resolved={info.resolved} required={info.required} />
      </Box>
      <Flex direction="column" gap={0}>
        <Flex gap={2} alignItems="center">
          <Typography
            variant="pi"
            fontWeight="semiBold"
            textColor={!info.resolved && info.required ? 'danger600' : 'neutral800'}
            style={{ fontFamily: 'monospace' }}
          >
            {info.prefixedKey ?? info.key}
          </Typography>
        </Flex>
        <Typography variant="pi" textColor="neutral600">
          {info.description}
        </Typography>
        {!info.resolved && info.required ? (
          <Typography variant="pi" textColor="danger600">
            Set in your .env file
          </Typography>
        ) : null}
      </Flex>
    </Flex>
  );
};

const EnvKeyList = ({ envKeys }: EnvKeyListProps): JSX.Element => {
  const required = envKeys.filter((k) => k.required);
  const optional = envKeys.filter((k) => !k.required);

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      {required.map((info) => (
        <EnvKeyRow key={info.key} info={info} />
      ))}
      {optional.length > 0 ? (
        <>
          <Box paddingTop={2} paddingBottom={1}>
            <Typography variant="sigma" textColor="neutral600">
              OPTIONAL
            </Typography>
          </Box>
          {optional.map((info) => (
            <EnvKeyRow key={info.key} info={info} />
          ))}
        </>
      ) : null}
    </Flex>
  );
};

export default EnvKeyList;
