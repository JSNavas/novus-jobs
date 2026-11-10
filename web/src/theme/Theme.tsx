import { createTheme } from '@mui/material/styles';
import components from './Components';
import typography from './Typography';
import { shadows } from './Shadows';
import { lightPalette } from './DefaultColors';

const baseTheme = createTheme({
  palette: { mode: 'light', ...lightPalette },
  shape: { borderRadius: 7 },
  shadows,
  typography,
});

export const appTheme = createTheme(baseTheme, {
  components: components(baseTheme),
});
