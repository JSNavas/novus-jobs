import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router';
import { appTheme } from './theme/Theme';
import router from './routes/Router';

const App = () => (
  <ThemeProvider theme={appTheme}>
    <CssBaseline />
    <RouterProvider router={router} />
  </ThemeProvider>
);

export default App;
