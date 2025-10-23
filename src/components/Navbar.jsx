// src/components/Navbar.jsx
import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Container,
  IconButton,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
  useMediaQuery,
  Badge,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import StorefrontIcon from "@mui/icons-material/Storefront";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssignmentAddIcon from "@mui/icons-material/AssignmentAdd";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import PersonIcon from "@mui/icons-material/Person";
import { isAdmin } from "../utils/authz";

/** 네비 항목 정의 */
const NAV_ITEMS = [
  { to: "/", label: "List", icon: <StorefrontIcon /> },
  { to: "/saved", label: "Like", icon: <FavoriteBorderIcon /> },
  { to: "/checkout", label: "Order", icon: <AssignmentAddIcon /> },
  { to: "/orders", label: "Order List", icon: <ReceiptLongIcon /> },
];

const AdminItem = { to: "/edit", label: "Admin", icon: <AdminPanelSettingsIcon /> };

/** 활성 경로 스타일 버튼 */
const NavButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  fontWeight: 600,
  borderRadius: 10,
  paddingInline: 14,
  "&.active": {
    background: theme.palette.action.selected,
  },
}));

export default function Navbar({
  user,
  onSignIn,   // 선택
  onSignUp,   // 선택
  onSignOut,  // 선택
  savedCount, // 선택: 숫자 전달 시 찜 배지 표시
}) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = React.useState(false);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const items = React.useMemo(() => {
    const base = [...NAV_ITEMS];
    if (isAdmin(user)) base.push(AdminItem);
    return base;
  }, [user]);

  /* 모바일 리스트 아이템 */
  const MobileList = (
    <Box
      role="presentation"
      sx={{ width: 280 }}
      onClick={() => setOpen(false)}
      onKeyDown={() => setOpen(false)}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <StorefrontIcon color="primary" />
        <Typography variant="h6" fontWeight={800}>
          Products
        </Typography>
        {isAdmin(user) && <Chip size="small" label="Admin" sx={{ ml: "auto" }} />}
      </Box>
      <Divider />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.to}
            component={RouterLink}
            to={it.to}
            selected={isActive(it.to)}
          >
            <ListItemIcon>
              {it.to === "/saved" && typeof savedCount === "number" && savedCount > 0 ? (
                <Badge color="primary" badgeContent={savedCount}>
                  {it.icon}
                </Badge>
              ) : (
                it.icon
              )}
            </ListItemIcon>
            <ListItemText primary={it.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2, display: "grid", gap: 1 }}>
        {user ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PersonIcon fontSize="small" />
              <Typography variant="body2" noWrap title={user?.email || ""}>
                {user?.displayName || user?.email || "로그인됨"}
              </Typography>
              {isAdmin(user) && (
                <Chip size="small" label="Admin" variant="outlined" sx={{ ml: "auto" }} />
              )}
            </Box>
            {onSignOut && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSignOut();
                }}
                startIcon={<LogoutIcon />}
                variant="outlined"
              >
                로그아웃
              </Button>
            )}
          </>
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            {onSignIn && (
              <Button onClick={onSignIn} startIcon={<LoginIcon />} variant="contained" fullWidth>
                lOGIN
              </Button>
            )}
            {onSignUp && (
              <Button onClick={onSignUp} variant="outlined" fullWidth>
                REGISTER
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ gap: 1 }}>
            {/* 모바일: 햄버거 */}
            {isMobile && (
              <IconButton edge="start" onClick={() => setOpen(true)} aria-label="메뉴 열기">
                <MenuIcon />
              </IconButton>
            )}

            {/* 로고 / 타이틀 */}
            <Box
              component={RouterLink}
              to="/"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <StorefrontIcon />
                <Typography variant="h6" fontWeight={800}>
                  Products
                </Typography>
              </Box>
            </Box>

            {/* 데스크톱: 네비 버튼들 */}
            {!isMobile && (
              <Box sx={{ display: "flex", gap: 0.5, ml: 2 }}>
                {items.map((it) => {
                  const active = isActive(it.to);
                  const isSaved = it.to === "/saved";
                  return (
                    <NavButton
                      key={it.to}
                      className={active ? "active" : ""}
                      component={RouterLink}
                      to={it.to}
                      color="inherit"
                      startIcon={
                        isSaved && typeof savedCount === "number" && savedCount > 0 ? (
                          <Badge color="primary" badgeContent={savedCount}>
                            <FavoriteBorderIcon />
                          </Badge>
                        ) : (
                          it.icon
                        )
                      }
                      aria-label={it.label}
                    >
                      {it.label}
                    </NavButton>
                  );
                })}
              </Box>
            )}

            {/* 우측 영역 */}
            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
              {user ? (
                <>
                  <Tooltip title={user?.email || ""}>
                    <Chip
                      icon={<PersonIcon />}
                      label={user?.displayName || user?.email || "로그인됨"}
                      variant="outlined"
                      sx={{ maxWidth: 220 }}
                    />
                  </Tooltip>
                  {isAdmin(user) && (
                    <Chip size="small" label="Admin" color="primary" variant="outlined" />
                  )}
                  {!isMobile && onSignOut && (
                    <Button
                      onClick={onSignOut}
                      startIcon={<LogoutIcon />}
                      variant="outlined"
                      sx={{ ml: 0.5 }}
                    >
                      LOGOUT
                    </Button>
                  )}
                </>
              ) : (
                !isMobile && (
                  <>
                    {onSignIn && (
                      <Button onClick={onSignIn} startIcon={<LoginIcon />} variant="contained">
                        LOGIN
                      </Button>
                    )}
                    {onSignUp && (
                      <Button onClick={onSignUp} variant="outlined">
                        REGISTER
                      </Button>
                    )}
                  </>
                )
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* 모바일 드로어 */}
      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        {MobileList}
      </Drawer>
    </>
  );
}
