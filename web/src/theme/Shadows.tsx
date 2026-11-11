import type { Shadows } from '@mui/material/styles';

/*
 * Sin sombras: en la torre la separación la hacen el borde de 1px y el salto
 * entre superficies grafito. Una sombra de plantilla rompe ese plano.
 */
const shadows: Shadows = [
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none', 'none',
];

export { shadows };
