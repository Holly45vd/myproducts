import React, { useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Alert, Link
} from "@mui/material";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";

export default function AuthEmailDialog({ open, onClose }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const title = useMemo(() => {
    if (mode === "signup") return "회원가입";
    if (mode === "reset") return "비밀번호 재설정";
    return "로그인";
  }, [mode]);

  const clear = () => { setErr(""); setPw(""); };

  const handleSignIn = async () => {
    setBusy(true); setErr("");
    try {
      await signInWithEmailAndPassword(getAuth(), email, pw);
      onClose?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  };

  const handleSignUp = async () => {
    setBusy(true); setErr("");
    try {
      const { user } = await createUserWithEmailAndPassword(getAuth(), email, pw);
      if (name.trim()) await updateProfile(user, { displayName: name.trim() });
      onClose?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  };

  const handleReset = async () => {
    setBusy(true); setErr("");
    try {
      await sendPasswordResetEmail(getAuth(), email);
      onClose?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          {mode === "signup" && (
            <TextField label="이름 (선택)" value={name} onChange={e=>setName(e.target.value)} />
          )}
          <TextField
            label="이메일"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
          />
          {mode !== "reset" && (
            <TextField
              label="비밀번호"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={pw}
              onChange={e=>setPw(e.target.value)}
            />
          )}

          {mode === "signin" && (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Link component="button" type="button" underline="hover" onClick={() => { clear(); setMode("reset"); }}>
                비밀번호를 잊으셨나요?
              </Link>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {mode === "signin" && (
          <>
            <Button onClick={() => { clear(); setMode("signup"); }} disabled={busy}>회원가입</Button>
            <Button onClick={handleSignIn} variant="contained" disabled={busy || !email || !pw}>로그인</Button>
          </>
        )}
        {mode === "signup" && (
          <>
            <Button onClick={() => { clear(); setMode("signin"); }} disabled={busy}>취소</Button>
            <Button onClick={handleSignUp} variant="contained" disabled={busy || !email || !pw}>가입</Button>
          </>
        )}
        {mode === "reset" && (
          <>
            <Button onClick={() => { clear(); setMode("signin"); }} disabled={busy}>취소</Button>
            <Button onClick={handleReset} variant="contained" disabled={busy || !email}>재설정 메일 보내기</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
