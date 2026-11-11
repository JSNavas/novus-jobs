import type { CSSProperties } from 'react';
import type { TypographyVariantsOptions } from '@mui/material/styles';

/*
 * Sin fuentes externas: el stack es el del sistema, para que la herramienta
 * funcione offline. El mono lo usan las cifras, los ids y las fechas.
 */
const sansFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const monoFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    metric: CSSProperties;
    mono: CSSProperties;
  }

  interface TypographyVariantsOptions {
    metric?: CSSProperties;
    mono?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    metric: true;
    mono: true;
  }
}

const typography: TypographyVariantsOptions = {
  fontFamily: sansFamily,
  metric: {
    fontFamily: monoFamily,
    fontWeight: 500,
    fontSize: '2rem',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  mono: {
    fontFamily: monoFamily,
    fontWeight: 400,
    fontSize: '0.8125rem',
    lineHeight: '1.25rem',
    fontVariantNumeric: 'tabular-nums',
  },
  h1: {
    fontWeight: 600,
    fontSize: '2.25rem',
    lineHeight: '2.75rem',
  },
  h2: {
    fontWeight: 600,
    fontSize: '1.875rem',
    lineHeight: '2.25rem',
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: '1.75rem',
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.3125rem',
    lineHeight: '1.6rem',
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.125rem',
    lineHeight: '1.6rem',
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
    lineHeight: '1.2rem',
  },
  overline: {
    fontFamily: monoFamily,
    fontSize: '0.6875rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    lineHeight: '1rem',
  },
  button: {
    textTransform: 'none',
    fontWeight: 400,
  },
  body1: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.334rem',
  },
  body2: {
    fontSize: '0.75rem',
    letterSpacing: '0rem',
    fontWeight: 400,
    lineHeight: '1rem',
  },
  subtitle1: {
    fontSize: '0.875rem',
    fontWeight: 400,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 400,
  },
};

export default typography;
