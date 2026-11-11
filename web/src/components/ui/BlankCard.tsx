import { Card } from '@mui/material';
import type { ReactNode } from 'react';

interface BlankCardProps {
  children: ReactNode;
  /** Dashed border: marks audit data, not pending work. */
  dashed?: boolean;
}

const BlankCard = ({ children, dashed = false }: BlankCardProps) => (
  <Card
    elevation={0}
    variant="outlined"
    sx={{ p: 0, position: 'relative', borderStyle: dashed ? 'dashed' : 'solid' }}
  >
    {children}
  </Card>
);

export default BlankCard;
