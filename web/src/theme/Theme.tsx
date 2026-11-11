import { createTheme } from '@mui/material/styles';
import components from './Components';
import typography from './Typography';
import { shadows } from './Shadows';
import { darkPalette } from './DefaultColors';

const baseTheme = createTheme({
  palette: { mode: 'dark', ...darkPalette },
  shape: { borderRadius: 3 },
  shadows,
  typography,
});

export const appTheme = createTheme(baseTheme, {
  components: components(baseTheme),
});
