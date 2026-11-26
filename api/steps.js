// Apple Sağlık → Kestirmeler ile adım senkronu.
// POST {action:"token", code}           → hesabın senkron anahtarı (yoksa oluşturur)
// POST {action:"reset", code}           → yeni anahtar (eskisi geçersiz olur)
// GET  /api/steps?t=ANAHTAR&s=8123[&d=YYYY-MM-DD]  (ya da POST {t, s, d})
//      → o günün adımını yazar. Tarih verilmezse Türkiye saatine göre bugün.
const { redis, P, CODE_RE, cleanCode, overLimit, send } = require("./_lib");
const crypto = require("crypto");

const trToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
// "8123", "8.123", "8,123", "8123,0", "8123.4" → 8123
function parseSteps(v){
  let s = String(v ?? "").replace(/[^\d.,]/g, "");
  if(/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  const n = Math.round(parseFloat(s.replace(",", ".")));
  return Number.isFinite(n) && n >= 0 && n < 200000 ? n : null;
}
async function tokenFor(code, fresh){
  let t = fresh ? null : await redis("GET", `${P}stokof:${code}`);
  if(t) return t;
  const old = await redis("GET", `${P}stokof:${code}`);
  if(old) await redis("DEL", `${P}stok:${old}`);
  t = crypto.randomBytes(12).toString("base64url");
  await redis("SET", `${P}stok:${t}`, code);
  await redis("SET", `${P}stokof:${code}`, t);
  return t;
}

module.exports = async (req, res) => {
  try {
    const q = new URL(req.url, "http://x").searchParams;
    const b = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {})) : {};
    if (b.action === "token" || b.action === "reset") {
      const code = cleanCode(b.code);
      if (!CODE_RE.test(code) || !(await redis("EXISTS", `${P}u:${code}`))) return send(res, 404, { error: "Hesap bulunamadı." });
      return send(res, 200, { token: await tokenFor(code, b.action === "reset") });
    }
    const t = String(b.t ?? q.get("t") ?? "").trim();
    const steps = parseSteps(b.s ?? q.get("s"));
    let d = String(b.d ?? q.get("d") ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) d = trToday();
    if (!t || t.length > 40) return send(res, 401, { error: "Anahtar eksik." });
    if (steps == null) return send(res, 400, { error: "Adım sayısı okunamadı." });
    if (await overLimit(`rl:steps:${t}:${new Date().toISOString().slice(0, 13)}`, 120, 3600)) return send(res, 429, { error: "Çok sık gönderim." });
    const code = await redis("GET", `${P}stok:${t}`);
    if (!code) return send(res, 401, { error: "Anahtar geçersiz. Sitede Hesap → Apple Sağlık'tan yenisini al." });
    const raw = await redis("GET", `${P}u:${code}`);
    if (!raw) return send(res, 404, { error: "Hesap bulunamadı." });
    const cur = JSON.parse(raw);
    const root = cur.json ? JSON.parse(cur.json) : { days: {} };
    root.days = root.days || {};
    const day = root.days[d] = root.days[d] || { f: [], w: 0, wo: "", ca: "", st: "", bu: "", kg: "" };
    // Telefon kilitliyken Sağlık verisi okunamaz, kestirme 0 ya da eksik sayı gönderir: aynı gün adım azalmaz
    const old = +day.st || 0, keep = steps < old;
    if (!keep) day.st = String(steps);
    root.stepSync = { at: Date.now(), d, s: steps };
    root.stepLog = [{ at: Date.now(), d, s: steps, k: keep ? 1 : 0 }, ...(root.stepLog || [])].slice(0, 10);
    const v = Math.max(Date.now(), (cur.updatedAt || 0) + 1);
    await redis("SET", `${P}u:${code}`, JSON.stringify({ json: JSON.stringify(root), updatedAt: v }));
    return send(res, 200, { ok: true, tarih: d, adim: keep ? old : steps, ...(keep ? { not: `Gelen ${steps} adım kayıtlı ${old} adımdan az, eski değer korundu.` } : {}) });
  } catch (e) { send(res, 500, { error: e.message }); }
};
