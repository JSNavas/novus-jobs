import { Card } from '@mui/material';
import type { ReactNode } from 'react';

interface BlankCardProps {
  children: ReactNode;
  /** Dashed border: marks audit data, not pending work. */
  dashed?: boolean;
  /**
   * Makes the whole card clickable, hover included.
   *
   * The hover used to live on an inner Box, so the tint stopped a hair short of
   * the border and left a bright seam along the bottom edge. The card is the
   * thing you click, so the card is the thing that lights up.
   */
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
      ...(onClick ? { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } } : {}),
    }}
  >
    {children}
  </Card>
);

export default BlankCard;
