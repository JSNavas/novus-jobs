import { Card } from '@mui/material';
import type { ReactNode } from 'react';

interface BlankCardProps {
  children: ReactNode;
  dashed?: boolean;
  onClick?: () => void;
}

const BlankCard = ({ children, dashed = false, onClick }: BlankCardProps) => (
  <Card
    elevation={0}
    variant="outlined"
    onClick={onClick}
    sx={{
      p: 0,
      position: 'relative',
      overflow: 'hidden',
      borderStyle: dashed ? 'dashed' : 'solid',
      ...(onClick
        ? {
          cursor: 'pointer',
          transition: 'background-color .15s, border-color .15s',
          '&:hover': { backgroundColor: 'grey.300', borderColor: 'grey.400' },
        }
        : {}),
    }}
  >
    {children}
  </Card>
);

export default BlankCard;
