import * as React from 'react';
import { styled } from '@material-ui/core/styles';
import NotificationsNoneRoundedIcon from '@material-ui/icons/NotificationsNoneRounded';
import Tooltip from '@material-ui/core/Tooltip';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import Badge from '@material-ui/core/Badge';
import Typography from '@material-ui/core/Typography';
import Popper from '@material-ui/core/Popper';
import Grow from '@material-ui/core/Grow';
import MuiPaper from '@material-ui/core/Paper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import MuiList from '@material-ui/core/List';
import MuiListItem from '@material-ui/core/ListItem';
import MuiDivider from '@material-ui/core/Divider';
import { getCookie } from 'docs/src/modules/utils/helpers';
import { useUserLanguage, useTranslate } from 'docs/src/modules/utils/i18n';

const Paper = styled(MuiPaper)({
  transformOrigin: 'top right',
});
const List = styled(MuiList)(({ theme }) => ({
  width: theme.spacing(40),
  maxHeight: theme.spacing(40),
  overflow: 'auto',
}));
const ListItem = styled(MuiListItem)({
  display: 'flex',
  flexDirection: 'column',
});
const Loading = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  margin: theme.spacing(1, 0),
}));
const Divider = styled(MuiDivider)(({ theme }) => ({
  margin: theme.spacing(1, 0),
}));

export default function Notifications() {
  const [open, setOpen] = React.useState(false);
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const t = useTranslate();
  const userLanguage = useUserLanguage();
  const [{ lastSeen, messages }, setNotifications] = React.useState({
    lastSeen: undefined,
    messages: undefined,
  });

  const messageList = messages
    ? messages
        .filter((message) => {
          if (
            message.userLanguage &&
            message.userLanguage !== userLanguage &&
            message.userLanguage !== navigator.language.substring(0, 2)
          ) {
            return false;
          }
          return true;
        })
        .reverse()
    : null;

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
    setTooltipOpen(false);

    if (messageList && messageList.length > 0) {
      const newLastSeen = messageList[0].id;
      setNotifications((notifications) => {
        if (newLastSeen !== notifications.lastSeen) {
          return {
            messages: notifications.messages,
            lastSeen: newLastSeen,
          };
        }
        return notifications;
      });
      document.cookie = `lastSeenNotification=${newLastSeen};path=/;max-age=31536000`;
    }
  };

  React.useEffect(() => {
    let active = true;

    // Prevent search engines from indexing the notification.
    if (/glebot/.test(navigator.userAgent) || messages) {
      return undefined;
    }

    // Soften the pressure on the main thread.
    const timeout = setTimeout(() => {
      fetch('https://raw.githubusercontent.com/mui-org/material-ui/master/docs/notifications.json')
        .then((response) => {
          return response.json();
        })
        .catch(() => {
          // Swallow the exceptions, e.g. rate limit
          return [];
        })
        .then((newMessages) => {
          if (active) {
            const seen = getCookie('lastSeenNotification');
            const lastSeenNotification = seen === '' ? 0 : parseInt(seen, 10);
            setNotifications({
              messages: newMessages || [],
              lastSeen: lastSeenNotification,
            });
          }
        });
    }, 1500);

    return () => {
      clearTimeout(timeout);
      active = false;
    };
  }, [messages]);

  return (
    <React.Fragment>
      <Tooltip
        open={tooltipOpen}
        onOpen={() => {
          setTooltipOpen(!open);
        }}
        onClose={() => {
          setTooltipOpen(false);
        }}
        title={t('toggleNotifications')}
        enterDelay={300}
      >
        <IconButton
          color="inherit"
          ref={anchorRef}
          aria-controls={open ? 'notifications-popup' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
          data-ga-event-category="AppBar"
          data-ga-event-action="toggleNotifications"
          sx={{ px: '10px' }}
        >
          <Badge
            color="error"
            badgeContent={
              messageList
                ? messageList.reduce(
                    (count, message) => (message.id > lastSeen ? count + 1 : count),
                    0,
                  )
                : 0
            }
          >
            <NotificationsNoneRoundedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popper
        id="notifications-popup"
        anchorEl={anchorRef.current}
        open={open}
        placement="bottom-end"
        transition
        disablePortal
        role={undefined}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener
            onClickAway={() => {
              setOpen(false);
            }}
          >
            <Grow in={open} {...TransitionProps}>
              <Paper>
                <List>
                  {messageList ? (
                    messageList.map((message, index) => (
                      <React.Fragment key={message.id}>
                        <ListItem alignItems="flex-start">
                          <Typography gutterBottom>{message.title}</Typography>
                          <Typography gutterBottom variant="body2">
                            <span
                              id="notification-message"
                              // eslint-disable-next-line react/no-danger
                              dangerouslySetInnerHTML={{ __html: message.text }}
                            />
                          </Typography>
                          {message.date && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(message.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Typography>
                          )}
                        </ListItem>
                        {index < messageList.length - 1 ? <Divider /> : null}
                      </React.Fragment>
                    ))
                  ) : (
                    <Loading>
                      <CircularProgress size={32} />
                    </Loading>
                  )}
                </List>
              </Paper>
            </Grow>
          </ClickAwayListener>
        )}
      </Popper>
    </React.Fragment>
  );
}
