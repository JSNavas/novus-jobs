import { Box, Drawer, Stack, Typography } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { t } from '../../../../i18n';
import SidebarItems from './SidebarItems';

const drawerWidth = 224;

const paperSx = {
  width: drawerWidth,
  boxSizing: 'border-box',
  borderRight: 1,
  borderColor: 'divider',
  display: 'flex',
  flexDirection: 'column',
};

const BrandMark = () => (
  <Box aria-hidden sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', gap: '3px', transform: 'skewY(-18deg)' }}>
    <Box sx={{ height: 17, bgcolor: 'primary.main' }} />
    <Box sx={{ height: 23, bgcolor: 'primary.main' }} />
    <Box sx={{ height: 17, bgcolor: 'primary.main' }} />
  </Box>
);

const SidebarContent = ({ onNavigate }: { onNavigate: () => void }) => (
  <>
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2.5, pt: 2.5, pb: 1.25 }}>
      <BrandMark />
      <Typography variant="mono" color="primary" sx={{ fontWeight: 600, fontSize: 15 }}>
        NOVUS·JOBS
      </Typography>
    </Stack>

    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 2.5, pb: 1.5, color: 'text.secondary' }}>
      <IconLock size={11} />
      <Typography variant="label">{t('sidebar.workspace')}</Typography>
    </Stack>

    <SidebarItems onNavigate={onNavigate} />

    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ px: 2.5, height: 46, borderTop: 1, borderColor: 'divider', color: 'text.secondary', flexShrink: 0 }}
    >
      <IconLock size={12} />
      <Typography variant="label">{t('sidebar.local')}</Typography>
    </Stack>
  </>
);

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => (
  <>
    <Box sx={{ width: drawerWidth, flexShrink: 0, display: { xs: 'none', lg: 'block' } }}>
      <Drawer variant="permanent" open sx={{ '& .MuiDrawer-paper': paperSx }}>
        <SidebarContent onNavigate={() => undefined} />
      </Drawer>
    </Box>
    <Drawer variant="temporary" open={mobileOpen} onClose={onClose} sx={{ display: { lg: 'none' }, '& .MuiDrawer-paper': paperSx }}>
      <SidebarContent onNavigate={onClose} />
    </Drawer>
  </>
);

export default Sidebar;
