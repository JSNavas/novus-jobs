import { Box, useMediaQuery } from '@mui/material';
import type { ReactNode } from 'react';

interface RiseProps {
  children: ReactNode;
  delay?: number;
  from?: number;
}

const Rise = ({ children, delay = 0, from = 10 }: RiseProps) => {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  if (still) return <>{children}</>;

  return (
    <Box
      sx={{
        animation: 'novus-rise 160ms ease-out both',
        animationDelay: `${delay}ms`,
        '@keyframes novus-rise': {
          from: { opacity: 0, transform: `translateY(${from}px)` },
          to: { opacity: 1, transform: 'none' },
        },
      }}
    >
      {children}
    </Box>
  );
};

export default Rise;
