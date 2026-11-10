import { Card } from '@mui/material';
import type { ReactNode } from 'react';

interface BlankCardProps {
  children: ReactNode;
}

const BlankCard = ({ children }: BlankCardProps) => (
  <Card elevation={0} variant="outlined" sx={{ p: 0, position: 'relative' }}>
    {children}
  </Card>
);

export default BlankCard;
