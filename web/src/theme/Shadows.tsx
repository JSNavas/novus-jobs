import type { Shadows } from '@mui/material/styles';

/*
 * No shadows: in the control tower, separation comes from the 1px border and
 * the step between graphite surfaces. A template shadow breaks that plane.
 */
const shadows: Shadows = [
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none', 'none',
];

export { shadows };
