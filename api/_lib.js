// Ortak yardımcılar: Upstash Redis (REST) + istek kontrolleri.
// Vercel'de projeye "Upstash for Redis" bağlanınca ortam değişkenleri otomatik gelir.
// Anahtarlar "fit:" ile başlar (ileride başka bir siteyle aynı veritabanı paylaşılırsa karışmasın diye).
const R_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const R_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const P = "fit:";

async function redis(...cmd) {
  if (!R_URL || !R_TOKEN) throw new Error("Veritabanı bağlı değil (Upstash ortam değişkenleri eksik).");
  const r = await fetch(R_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${R_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// Karışmayan karakterler: 0/O, 1/I/L yok. Kodlar 4 karakter.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
function newCode() {
  const bytes = require("crypto").randomBytes(4);
  let s = ""; for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}
const cleanCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const ipOf = req => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

// Basit sayaç: süre dolunca sıfırlanır. limit aşılırsa true döner.
async function overLimit(key, limit, seconds) {
  const n = await redis("INCR", P + key);
  if (n === 1) await redis("EXPIRE", P + key, seconds);
  return n > limit;
}
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
const today = () => new Date().toISOString().slice(0, 10);

module.exports = { redis, P, CODE_RE, newCode, cleanCode, ipOf, overLimit, send, today };
