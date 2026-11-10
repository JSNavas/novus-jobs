import { Box, Drawer, Typography } from '@mui/material';
import SidebarItems from './SidebarItems';

const drawerWidth = 270;

const paperSx = { width: drawerWidth, boxSizing: 'border-box', border: 0, boxShadow: 1 };

const SidebarContent = ({ onNavigate }: { onNavigate: () => void }) => (
  <>
    <Box px={3} py={2}>
      <Typography variant="h5" color="primary" fontWeight={700}>
        Novus Jobs
      </Typography>
    </Box>
    <SidebarItems onNavigate={onNavigate} />
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
