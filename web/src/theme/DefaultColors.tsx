const INK = '#0A0C0E';

/*
 * Only three saturated colors: green (ok), amber (warning) and red (failure).
 * The muted cyan is the only accent and is reserved for focus, links and selection.
 * The grays step the background surfaces up to the card surface.
 */
const darkPalette = {
  primary: {
    main: '#7FB8C4',
    light: 'rgba(127,184,196,0.12)',
    dark: '#5F9AA8',
    contrastText: INK,
  },
  secondary: {
    main: '#8A96A3',
    light: 'rgba(138,150,163,0.12)',
    dark: '#6B7785',
    contrastText: INK,
  },
  success: {
    main: '#5BE38F',
    light: 'rgba(91,227,143,0.12)',
    dark: '#3FBF73',
    contrastText: INK,
  },
  info: {
    main: '#7FB8C4',
    light: 'rgba(127,184,196,0.12)',
    dark: '#5F9AA8',
    contrastText: INK,
  },
  error: {
    main: '#FF5C5C',
    light: 'rgba(255,92,92,0.14)',
    dark: '#D94646',
    contrastText: INK,
  },
  warning: {
    main: '#E9A23B',
    light: 'rgba(233,162,59,0.12)',
    dark: '#C7852A',
    contrastText: INK,
  },
  grey: {
    100: '#101417',
    200: '#161B1F',
    300: '#222930',
    400: '#3A444E',
    500: '#8A96A3',
    600: '#C9D1D9',
  },
  text: {
    primary: '#D5DCE3',
    secondary: '#8A96A3',
  },
  action: {
    hover: 'rgba(213,220,227,0.05)',
    selected: 'rgba(127,184,196,0.12)',
    disabledBackground: 'rgba(213,220,227,0.08)',
    hoverOpacity: 0.05,
  },
  divider: '#232A31',
  background: {
    default: INK,
    paper: '#12161A',
  },
};

export { darkPalette };
