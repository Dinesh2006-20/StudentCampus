import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const TOKEN_KEY = "sc_token";

export const api = axios.create({ baseURL: API, withCredentials: true });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export function errMsg(e) {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || "Something went wrong. Please try again.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x && typeof x.msg === "string" ? x.msg : JSON.stringify(x))).join(" ");
  if (typeof d.msg === "string") return d.msg;
  return String(d);
}

export const get = (url, params) => api.get(url, { params }).then((r) => r.data);

export const paperFileName = (p) =>
  `${p.dept}_${p.subject_code}_${p.exam_type.replace(/\s/g, "")}_${p.exam_year}.${p.file_type === "PDF" ? "pdf" : "png"}`;

export async function paperBlob(id, download = false) {
  const r = await api.get(`/papers/${id}/file`, { params: { download: download ? 1 : 0 }, responseType: "blob" });
  return r.data;
}

export async function downloadPaper(p) {
  const blob = await paperBlob(p.id, true);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = paperFileName(p);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
