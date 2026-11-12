import { language, t, type Language } from '../../../../i18n';
import {
  AppBar, Badge, Box, Divider, IconButton, ListItemText, Menu, MenuItem, Stack, ToggleButton,
  ToggleButtonGroup, Toolbar, Tooltip, Typography,
} from '@mui/material';
import { IconBell, IconMenu2 } from '@tabler/icons-react';
import { useState, type MouseEvent } from 'react';
import { AppStatusPilot } from '../../../../components/ui';
import { formatDateTime } from '../../../../format';
import { useNotifications } from '../../../../notifications';

const LANGUAGES: Language[] = ['es', 'en'];

const toneOf = { success: 'success', warning: 'neutral', error: 'error' } as const;

interface HeaderProps {
  onMenuClick: () => void;
  onLanguageChange: (next: Language) => void;
}

const Header = ({ onMenuClick, onLanguageChange }: HeaderProps) => {
  const { notices, unread, markRead } = useNotifications();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const open = (event: MouseEvent<HTMLElement>): void => {
    setAnchor(event.currentTarget);
    markRead();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: 'background.default', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar variant="dense">
        <IconButton aria-label={t('header.openMenu')} onClick={onMenuClick} sx={{ mr: 1, display: { sm: 'none' } }}>
          <IconMenu2 size="20" />
        </IconButton>
        <Typography variant="overline" color="textSecondary">
          {t('app.name')}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={language()}
            onChange={(_, next: Language | null) => { if (next) onLanguageChange(next); }}
            aria-label={t('header.language')}
          >
            {LANGUAGES.map((code) => (
              <ToggleButton
                key={code}
                value={code}
                sx={{ px: 1, py: 0.25, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }}
              >
                {code.toUpperCase()}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Tooltip title={t('header.notifications')}>
            <IconButton aria-label={t('header.notifications')} size="small" onClick={open}>
              <Badge
                badgeContent={unread}
                max={99}
                color="success"
                slotProps={{ badge: { style: { fontSize: 9, height: 15, minWidth: 15 } } }}
              >
                <IconBell size={18} stroke={1.6} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Stack>

        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
        >
          <Typography variant="label" color="text.secondary" sx={{ display: 'block', px: 2, pt: 1, pb: 1 }}>
            {t('header.notifications')}
          </Typography>
          <Divider />

          {notices.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">{t('notice.empty')}</Typography>
            </MenuItem>
          ) : notices.map((notice) => (
            <MenuItem key={notice.id} sx={{ alignItems: 'flex-start', py: 1.25, whiteSpace: 'normal' }}>
              <Box sx={{ pt: 0.5, pr: 1.5 }}>
                <AppStatusPilot tone={toneOf[notice.tone]} srLabel={notice.title} />
              </Box>
              <ListItemText
                primary={notice.title}
                secondary={
                  <>
                    {notice.detail}
                    <Typography variant="label" component="span" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                      {formatDateTime(notice.at)}
                    </Typography>
                  </>
                }
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
