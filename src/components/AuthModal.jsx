// src/components/AuthModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Stack,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function AuthModal({ open, onClose, onSignIn, onSignUp }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      // reset on close
      setSubmitting(false);
      setErr("");
      setPassword("");
      setEmail("");
      setMode("signin");
      setShowPw(false);
    }
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr("");
    if (!email || !password) {
      setErr("이메일과 비밀번호를 입력하세요.");
      return;
    }
    try {
      setSubmitting(true);
      if (mode === "signin") await onSignIn(email, password);
      else await onSignUp(email, password);
      onClose?.();
    } catch (e) {
      setErr(e?.message || e?.code || "처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = email && password && !submitting;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Tabs
          value={mode}
          onChange={(_, v) => {
            setMode(v);
            setErr("");
          }}
          aria-label="auth-mode"
        >
          <Tab value="signin" label="로그인" />
          <Tab value="signup" label="회원가입" />
        </Tabs>
      </DialogTitle>

      <DialogContent>
        <form onSubmit={submit} id="authForm">
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}

            <TextField
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              fullWidth
              required
              size="small"
              autoComplete="email"
            />

            <TextField
              label="비밀번호"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              size="small"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="비밀번호 표시 토글"
                      onClick={() => setShowPw((v) => !v)}
                      edge="end"
                    >
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText={
                mode === "signup" ? "8자 이상, 안전한 비밀번호를 권장합니다." : " "
              }
            />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          닫기
        </Button>
        <Button
          type="submit"
          form="authForm"
          variant="contained"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting
            ? (mode === "signin" ? "로그인 중…" : "가입 중…")
            : (mode === "signin" ? "로그인" : "가입")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
