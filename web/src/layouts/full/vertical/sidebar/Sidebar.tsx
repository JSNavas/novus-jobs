import { Box, Drawer, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import SidebarItems from './SidebarItems';

const fullWidth = 224;
const railWidth = 64;

const BrandMark = () => (
  <Box aria-hidden sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', gap: '3px', transform: 'skewY(-18deg)' }}>
    <Box sx={{ height: 17, bgcolor: 'primary.main' }} />
    <Box sx={{ height: 23, bgcolor: 'primary.main' }} />
    <Box sx={{ height: 17, bgcolor: 'primary.main' }} />
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
