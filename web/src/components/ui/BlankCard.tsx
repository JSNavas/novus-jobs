import { Card } from '@mui/material';
import type { ReactNode } from 'react';

interface BlankCardProps {
  children: ReactNode;
  /** Borde discontinuo: marca lo que es auditoría y no trabajo pendiente. */
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
