import React from "react";
import { Toolbar, Typography, Stack, Button, Box, Avatar } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useSaved } from "../providers/SavedProvider";
import AuthEmailDialog from "./AuthEmailDialog";
import { getAuth, signOut } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar() {
const { pathname } = useLocation();
const { user, loadingUser } = useSaved();
const [open, setOpen] = React.useState(false);
const { isKorean, toggle } = useLanguage();
const Btn = ({ to, label }) => (
<Button component={RouterLink} to={to} variant={pathname === to ? "contained" : "text"} size="small">
{label}
</Button>
);
return (
<Toolbar sx={{ gap: 1 }}>
<Typography variant="h6" sx={{ fontWeight: 700, mr: 2 }}>Store</Typography>
<Stack direction="row" spacing={0.5}>
<Btn to="/" label="List" />
<Btn to="/likes" label="Like" />
<Btn to="/orders" label="Order" />
<Btn to="/admin" label="Admin" />
</Stack>
<Box sx={{ flex: 1 }} />
{/* 언어 토글 */}
      <Button size="small" onClick={toggle} aria-label="언어 전환" sx={{ mr: 1 }}>
        {isKorean ? "KO" : "EN"}
      </Button>

 {!loadingUser && (
       user ? (
         <Stack direction="row" spacing={1} alignItems="center">
           <Avatar sx={{ width: 28, height: 28 }} src={user.photoURL || ""} alt={user.email || "U"} />
           <Button size="small" onClick={() => signOut(getAuth())}>로그아웃</Button>
         </Stack>
       ) : (
         <Button size="small" variant="contained" onClick={() => setOpen(true)}>로그인</Button>
       )
     )}
     <AuthEmailDialog open={open} onClose={() => setOpen(false)} />
</Toolbar>
);
}