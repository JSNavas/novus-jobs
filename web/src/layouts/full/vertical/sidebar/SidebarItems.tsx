import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { IconBriefcase } from '@tabler/icons-react';
import { NavLink } from 'react-router';

const menuItems = [{ title: 'Ofertas de empleo', to: '/', icon: IconBriefcase }];

interface SidebarItemsProps {
  onNavigate: () => void;
}

const SidebarItems = ({ onNavigate }: SidebarItemsProps) => (
  <List sx={{ px: 2 }}>
    {menuItems.map(({ title, to, icon: Icon }) => (
      <ListItemButton key={to} component={NavLink} to={to} end onClick={onNavigate} sx={{ borderRadius: 1 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Icon size="20" stroke={1.5} />
        </ListItemIcon>
        <ListItemText primary={title} />
      </ListItemButton>
    ))}
  </List>
);

export default SidebarItems;
