// project imports
import './DefaultColors';
import { Theme, ThemeOptions } from '@mui/material/styles';

const components = (theme: Theme): ThemeOptions['components'] => {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          height: '100%',
          width: '100%',
        },
        a: {
          textDecoration: 'none',
        },
        body: {
          height: '100%',
          margin: 0,
          padding: 0,
        },
        '#root': {
          height: '100%',
        },
        '::selection': {
          backgroundColor: theme.palette.primary.dark,
          color: theme.palette.primary.contrastText,
        },
        '*:focus-visible': {
          outline: `1px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
        "*[dir='rtl'] .buyNowImg": {
          transform: 'scaleX(-1)',
        },
        '.border-none': {
          border: '0px',
          td: {
            border: '0px',
          },
        },
        '.btn-xs': {
          minWidth: '30px !important',
          width: '30px',
          height: '30px',
          borderRadius: '6px !important',
          padding: '0px !important',
        },
        '.hover-text-primary:hover .text-hover': {
          color: theme.palette.primary.main,
        },
        '.hoverCard:hover': {
          scale: '1.01',
          transition: ' 0.1s ease-in',
        },
        '.signup-bg': {
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
        },
        '.MuiBox-root': {
          borderRadius: theme.shape.borderRadius,
        },
        '.MuiCardHeader-action': {
          alignSelf: 'center !important',
        },
        '.emoji-picker-react .emoji-scroll-wrapper': {
          overflowX: 'hidden',
        },
        '.scrollbar-container': {
          borderRight: '0 !important',
        },
        '.theme-timeline .MuiTimelineOppositeContent-root': {
          minWidth: '90px',
        },
        '.MuiAlert-root .MuiAlert-icon': {
          color: 'inherit!important',
        },
        '.MuiTimelineConnector-root': {
          width: '1px !important',
        },
        ' .simplebar-scrollbar:before': {
          background: `${theme.palette.grey[300]} !important`,
        },
        '@keyframes gradient': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: ' 100% 50%',
          },
          '100% ': {
            backgroundPosition: ' 0% 50%',
          },
        },
        '@keyframes slide': {
          '0%': {
            transform: 'translate3d(0, 0, 0)',
          },
          '100% ': {
            transform: 'translate3d(-2086px, 0, 0)',
          },
        },
        '.rounded-bars .apexcharts-bar-series.apexcharts-plot-series .apexcharts-series path': {
          clipPath: 'inset(0 0 5% 0 round 20px)',
        },
      },
    },
    MuiButtonGroup: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          ':before': {
            backgroundColor: theme.palette.grey[100],
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          // border: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
        sizeSmall: {
          width: 30,
          height: 30,
          minHeight: 30,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.main,
          },
        },
        colorPrimary: {
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.background.default,
          },
        },
        colorSecondary: {
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.background.default,
          },
        },
        colorSuccess: {
          '&:hover': {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.background.default,
          },
        },
        colorError: {
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.background.default,
          },
        },
        colorWarning: {
          '&:hover': {
            backgroundColor: theme.palette.warning.main,
            color: theme.palette.background.default,
          },
        },
        colorInfo: {
          '&:hover': {
            backgroundColor: theme.palette.info.main,
            color: theme.palette.background.default,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
        },
        text: {
          padding: '5px 15px',
          '&:hover': {
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.main,
          },
        },
        textPrimary: {
          backgroundColor: theme.palette.primary.light,
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.background.default,
          },
        },
        textSecondary: {
          backgroundColor: theme.palette.secondary.light,
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.background.default,
          },
        },
        textSuccess: {
          backgroundColor: theme.palette.success.light,
          '&:hover': {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.background.default,
          },
        },
        textError: {
          backgroundColor: theme.palette.error.light,
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.background.default,
          },
        },
        textInfo: {
          backgroundColor: theme.palette.info.light,
          '&:hover': {
            backgroundColor: theme.palette.info.main,
            color: theme.palette.background.default,
          },
        },
        textWarning: {
          backgroundColor: theme.palette.warning.light,
          '&:hover': {
            backgroundColor: theme.palette.warning.main,
            color: theme.palette.background.default,
          },
        },
        outlinedPrimary: {
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.background.default,
          },
        },
        outlinedSecondary: {
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.background.default,
          },
        },
        outlinedError: {
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.background.default,
          },
        },
        outlinedSuccess: {
          '&:hover': {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.background.default,
          },
        },
        outlinedInfo: {
          '&:hover': {
            backgroundColor: theme.palette.info.main,
            color: theme.palette.background.default,
          },
        },
        outlinedWarning: {
          '&:hover': {
            backgroundColor: theme.palette.warning.main,
            color: theme.palette.background.default,
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
        title: {
          fontSize: '1.125rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          width: '100%',
          padding: '15px',
          backgroundImage: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${theme.palette.divider}`,
          fontVariantNumeric: 'tabular-nums',
        },
        head: {
          ...theme.typography.overline,
          color: theme.palette.text.secondary,
          textTransform: 'uppercase',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.grey[200],
          borderRadius: '6px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: theme.shape.borderRadius,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        filledSuccess: {
          color: theme.palette.background.default,
        },
        filledInfo: {
          color: theme.palette.background.default,
        },
        filledError: {
          color: theme.palette.background.default,
        },
        filledWarning: {
          color: theme.palette.background.default,
        },
        standardSuccess: {
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.main,
        },
        standardError: {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.main,
        },
        standardWarning: {
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.warning.main,
        },
        standardInfo: {
          backgroundColor: theme.palette.info.light,
          color: theme.palette.info.main,
        },
        outlinedSuccess: {
          borderColor: theme.palette.success.main,
          color: theme.palette.success.main,
        },
        outlinedWarning: {
          borderColor: theme.palette.warning.main,
          color: theme.palette.warning.main,
        },
        outlinedError: {
          borderColor: theme.palette.error.main,
          color: theme.palette.error.main,
        },
        outlinedInfo: {
          borderColor: theme.palette.info.main,
          color: theme.palette.info.main,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor:
              theme.palette.mode === 'dark' ? theme.palette.grey[200] : theme.palette.grey[300],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          }
        },
        input: {
          padding: '12px 14px',
        },
        inputSizeSmall: {
          padding: '8px 14px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: theme.palette.background.paper,
          background: theme.palette.text.primary,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderColor: `${theme.palette.divider}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          border: `1px solid ${theme.palette.divider}`,
        },
      },
    },
  };
};
export default components;
