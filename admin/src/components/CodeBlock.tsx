import type { JSX, PropsWithChildren } from 'react';
import { Box, Typography } from '@strapi/design-system';
import { useTheme } from 'styled-components';

const CodeBlock = ({ children }: PropsWithChildren): JSX.Element => {
  const theme = useTheme();

  return (
    <Box
      padding={4}
      hasRadius
      style={{ overflowX: 'auto', background: theme.colors.neutral100 }}
    >
      <Typography
        variant="pi"
        tag="pre"
        style={{ fontFamily: 'monospace', whiteSpace: 'pre', margin: 0 }}
      >
        {children}
      </Typography>
    </Box>
  );
};

export default CodeBlock;
