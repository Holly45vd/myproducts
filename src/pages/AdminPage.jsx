import React, { useMemo, useState } from "react";
import { Stack, Typography, Paper, Button, TextField, Alert } from "@mui/material";
import { parseCsv, normalizeHeader, rowToProduct } from "../shared/utils/csv";


export default function AdminPage() {
const [csv, setCsv] = useState("");
const [rows, setRows] = useState([]);
const [header, setHeader] = useState([]);


const handleParse = () => {
const table = parseCsv(csv);
if (!table.length) return;
const [h, ...body] = table;
const norm = h.map(normalizeHeader);
setHeader(norm);
setRows(body);
};


const products = useMemo(() => rows.map(r => rowToProduct(r, header)).filter(Boolean), [rows, header]);


return (
<Stack spacing={2} sx={{ py:2 }}>
<Typography variant="h5" fontWeight={700}>어드민</Typography>
<Paper variant="outlined" sx={{ p:2 }}>
<Stack spacing={1}>
<TextField label="CSV (paste here)" multiline minRows={6} value={csv} onChange={e=>setCsv(e.target.value)} />
<Button variant="contained" onClick={handleParse}>파싱</Button>
</Stack>
</Paper>
{products.length > 0 ? (
<Alert severity="success">파싱 결과: {products.length} 건</Alert>
) : (
<Alert severity="info">CSV를 붙여넣고 파싱하세요.</Alert>
)}
</Stack>
);
}