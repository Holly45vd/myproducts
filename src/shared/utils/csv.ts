export function parseCsv(text: string): string[][] {
  let src = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const sep = src.includes("\t") ? "\t" : ",";
  const out: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') { if (inQ && src[i + 1] === '"') { cell += '"'; i++; } else inQ = !inQ; continue; }
    if (!inQ && (ch === sep || ch === "\n")) { cur.push(cell); cell = ""; if (ch === "\n") { out.push(cur); cur = []; } continue; }
    cell += ch;
  }
  cur.push(cell);
  if (cur.length) out.push(cur);
  return out.filter((r) => r.some((c) => String(c).trim() !== ""));
}

export function normalizeHeader(h: string): string {
  const raw = String(h).trim();
  const canon = raw.toLowerCase().replace(/[\s_]+/g, "").replace(/\([^)]*\)/g, "");
  if (["id","상품id","문서id","productid"].includes(canon)) return "id";
  if (["상품명","name","title","productname"].includes(canon)) return "name";
  if (["영문명","영어명","productnameen","nameen","productname_en","name_en"].includes(canon)) return "name_en";
  if (["상품코드","productcode","code","pdno"].includes(canon)) return "productCode";
  if (["가격","price"].includes(canon)) return "price";
  if (["평점","rating"].includes(canon)) return "rating";
  if (["리뷰수","review","reviews","reviewcount"].includes(canon)) return "reviewCount";
  if (["조회수","views","view"].includes(canon)) return "views";
  if (["태그","tags"].includes(canon)) return "tags";
  if (["링크","url","link"].includes(canon)) return "link";
  if (["이미지","이미지url","image","imageurl","thumbnail"].includes(canon)) return "imageUrl";
  if (["재입고","restock","restockable"].includes(canon)) return "restockable";
  if (["상태","status"].includes(canon)) return "status";
  if (["재고","stock","재고수량"].includes(canon)) return "stock";
  if (/^(대분류|categoryl1)$/.test(canon)) return "categoryL1";
  if (/^(중분류|categoryl2)$/.test(canon)) return "categoryL2";
  if (/^(대분류en|categoryl1en|categoryl1_en)$/.test(canon)) return "categoryL1_en";
  if (/^(중분류en|categoryl2en|categoryl2_en)$/.test(canon)) return "categoryL2_en";
  return raw;
}

const toNum = (s?: string) => (s ? Number(String(s).replace(/[^\d.]/g, "")) || 0 : 0);
const clean = (s?: string) => String(s ?? "").replace(/\s+/g, " ").replace(/^"|"$/g, "").trim();

export type ProductRow = {
  id: string;
  name?: string; name_en?: string;
  productCode?: string; price?: number; rating?: number;
  reviewCount?: number; views?: number;
  tags?: string[]; link?: string; imageUrl?: string;
  restockable?: boolean; status?: string; stock?: number;
  categoryL1?: string; categoryL2?: string; categoryL1_en?: string; categoryL2_en?: string;
};

export function rowToProduct(row: string[], header: string[]): ProductRow | null {
  const obj: Record<string, string> = {};
  header.forEach((key, idx) => (obj[key] = row[idx] ?? ""));
  const id = clean(obj.id || obj.productCode);
  if (!id) return null;

  const product: ProductRow = { id };
  const fields = {
    name: clean(obj.name),
    name_en: obj.name_en ? clean(obj.name_en) : undefined,
    imageUrl: clean(obj.imageUrl),
    link: clean(obj.link),
    productCode: clean(obj.productCode),
    price: obj.price ? toNum(obj.price) : undefined,
    rating: obj.rating ? Number(String(obj.rating).replace(/[^\d.]/g, "")) || 0 : undefined,
    reviewCount: obj.reviewCount ? toNum(obj.reviewCount) : undefined,
    views: obj.views ? toNum(obj.views) : undefined,
    restockable: obj.restockable ? /^(true|1|yes|y|예)$/i.test(String(obj.restockable).trim()) : undefined,
    status: obj.status ? String(obj.status).trim() : undefined,
    stock: obj.stock ? Number(String(obj.stock).replace(/[^\d-]/g, "")) || 0 : undefined,
    categoryL1: obj.categoryL1 ? clean(obj.categoryL1) : undefined,
    categoryL2: obj.categoryL2 ? clean(obj.categoryL2) : undefined,
    categoryL1_en: obj.categoryL1_en ? clean(obj.categoryL1_en) : undefined,
    categoryL2_en: obj.categoryL2_en ? clean(obj.categoryL2_en) : undefined,
  } as const;

  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined) return;
    if (typeof v === "string" && !v) return;
    (product as any)[k] = v;
  });

  if (obj.tags != null && String(obj.tags).trim() !== "") {
    product.tags = String(obj.tags)
      .split(/[,|#\/ ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return product;
}
