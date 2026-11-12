import { Box, Drawer, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import SidebarItems from './SidebarItems';

const fullWidth = 224;
const railWidth = 64;

// El monograma NJ calado en la pastilla. El recorte va por máscara y no por
// fill-rule: las siluetas de la N y de la J se solapan en el gancho, y con
// evenodd ese solape se rellenaría de cian en vez de quedar hueco.
const BrandMark = () => (
  <Box
    aria-hidden
    component="svg"
    viewBox="0 0 48 48"
    sx={{ width: 26, height: 26, flexShrink: 0, color: 'primary.main', display: 'block' }}
  >
    <mask id="novus-jobs-mark" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
      <rect width="48" height="48" fill="#000" />
      <path d="M13,3 H45 V35 L35,45 H3 V13 Z" fill="#fff" />
      <path d="M9,38 H13.5 V22 L21,38 H25.5 V10 H21 V26 L13.5,10 H9 Z" fill="#000" />
      <path d="M29,10 H39 V14.5 H33.5 V31 Q33.5,38 27,38 Q24,38 22,36.5 L23.8,32.5 Q25,33.5 26.4,33.5 Q29,33.5 29,30.3 Z" fill="#000" />
    </mask>
    <path d="M13,3 H45 V35 L35,45 H3 V13 Z" fill="currentColor" mask="url(#novus-jobs-mark)" />
  </Box>
);

const SidebarContent = ({ onNavigate, collapsed }: { onNavigate: () => void; collapsed: boolean }) => (
  <>
    <Stack
      direction="row"
      spacing={collapsed ? 0 : 1.25}
      alignItems="center"
      justifyContent={collapsed ? 'center' : 'flex-start'}
      sx={{ px: collapsed ? 0 : 2.5, pt: 2.5, pb: collapsed ? 2.5 : 1.25 }}
    >
      <BrandMark />
      {collapsed ? null : (
        <Typography variant="mono" color="primary" sx={{ fontWeight: 600, fontSize: 15 }}>
          NOVUS·JOBS
        </Typography>
      )}
    </Stack>

    <SidebarItems onNavigate={onNavigate} collapsed={collapsed} />

    <Box sx={{ height: 46, borderTop: 1, borderColor: 'divider', flexShrink: 0 }} />

  </>
);

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const pinned = useMediaQuery(theme.breakpoints.up('sm'));
  const collapsed = pinned && !wide;
  const width = collapsed ? railWidth : fullWidth;

  const paperSx = {
    width,
    boxSizing: 'border-box',
    borderRight: 1,
    borderColor: 'divider',
    display: 'flex',
    flexDirection: 'column',
  };

  if (pinned) {
    return (
      <Box sx={{ width, flexShrink: 0 }}>
        <Drawer variant="permanent" open sx={{ '& .MuiDrawer-paper': paperSx }}>
          <SidebarContent onNavigate={() => undefined} collapsed={collapsed} />
        </Drawer>
      </Box>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { ...paperSx, width: fullWidth } }}
    >
      <SidebarContent onNavigate={onClose} collapsed={false} />
    </Drawer>
  );
};

export default Sidebar;
