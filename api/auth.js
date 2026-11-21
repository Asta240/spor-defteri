// Giriş: kullanıcı adı + şifre ve Google ile giriş. Hesabın kendisi yine 4 haneli kodun altında durur;
// bu dosya sadece "kullanıcı adı / Google hesabı → kod" eşleşmesini tutar.
//
// GET  /api/auth                                  → {google: CLIENT_ID | null}  (Google butonu gösterilsin mi)
// POST /api/auth {action:"register", user, email, pass, code?} → yeni hesap açar (ya da verilen koda bağlar) → {code, user}
// POST /api/auth {action:"login", user, pass}            → {code, user}
// POST /api/auth {action:"google", credential, code?}    → Google ile giriş/kayıt (ya da koda bağlama) → {code, email}
// POST /api/auth {action:"whoami", code}                 → {user, email} (bu koda bağlı giriş yolları)
const crypto = require("crypto");
const { redis, P, CODE_RE, newCode, cleanCode, ipOf, overLimit, send, today } = require("./_lib");

const USER_RE = /^[a-z0-9._]{3,20}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const cleanEmail = e => String(e || "").trim().toLowerCase();
const cleanUser = u => String(u || "").trim().toLocaleLowerCase("tr").replace(/ı/g, "i");
const hashPass = (pass, salt) => crypto.scryptSync(String(pass), salt, 32).toString("hex");

async function createAccount(req) {
  if (await overLimit(`rl:new:${ipOf(req)}:${today()}`, 20, 86400)) throw [429, "Bugün çok fazla yeni hesap açıldı, yarın tekrar dene."];
  for (let i = 0; i < 8; i++) {
    const code = newCode();
    const ok = await redis("SET", `${P}u:${code}`, JSON.stringify({ json: null, updatedAt: 0 }), "NX");
    if (ok === "OK") return code;
  }
  throw [500, "Hesap açılamadı, tekrar dene."];
}
async function existingCode(c) {
  const code = cleanCode(c);
  if (!CODE_RE.test(code) || !(await redis("EXISTS", `${P}u:${code}`))) throw [404, "Bu kod bulunamadı."];
  return code;
}
async function verifyGoogle(credential) {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw [400, "Google girişi henüz açılmadı."];
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(String(credential || "")));
  const t = await r.json().catch(() => ({}));
  if (!r.ok || t.aud !== id || !t.sub || !["accounts.google.com", "https://accounts.google.com"].includes(t.iss) || Number(t.exp) * 1000 < Date.now())
    throw [401, "Google girişi doğrulanamadı, tekrar dene."];
  return { sub: t.sub, email: t.email_verified === "true" || t.email_verified === true ? t.email : "" };
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") return send(res, 200, { google: process.env.GOOGLE_CLIENT_ID || null });
    if (req.method !== "POST") return send(res, 405, { error: "POST kullan" });
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const ip = ipOf(req);

    if (b.action === "register") {
      const user = cleanUser(b.user), email = cleanEmail(b.email), pass = String(b.pass || "");
      if (!USER_RE.test(user)) return send(res, 400, { error: "Kullanıcı adı 3–20 karakter olsun: harf, rakam, nokta ya da alt çizgi." });
      if (!EMAIL_RE.test(email)) return send(res, 400, { error: "Geçerli bir e-posta yaz." });
      if (pass.length < 6 || pass.length > 100) return send(res, 400, { error: "Şifre en az 6 karakter olsun." });
      if (await redis("EXISTS", `${P}login:${user}`)) return send(res, 409, { error: "Bu kullanıcı adı alınmış." });
      if (await redis("EXISTS", `${P}email:${email}`)) return send(res, 409, { error: "Bu e-posta ile zaten bir hesap var." });
      let code;
      if (b.code) {
        code = await existingCode(b.code);
        if (await redis("GET", `${P}userof:${code}`)) return send(res, 409, { error: "Bu hesaba zaten bir kullanıcı adı bağlı." });
      } else code = await createAccount(req);
      const salt = crypto.randomBytes(16).toString("hex");
      const ok = await redis("SET", `${P}login:${user}`, JSON.stringify({ s: salt, h: hashPass(pass, salt), code, email }), "NX");
      if (ok !== "OK") return send(res, 409, { error: "Bu kullanıcı adı alınmış." });
      await redis("SET", `${P}email:${email}`, user);
      await redis("SET", `${P}userof:${code}`, user);
      return send(res, 200, { code, user });
    }

    if (b.action === "login") {
      const user = cleanUser(b.user), pass = String(b.pass || "");
      // Şifre tahminine karşı: aynı bağlantıdan saatte 20, aynı kullanıcı adına saatte 10 yanlış deneme
      const hour = new Date().toISOString().slice(0, 13);
      const kIp = `rl:pw:${ip}:${hour}`, kUser = `rl:pwu:${user}:${hour}`;
      if (Number((await redis("GET", P + kIp)) || 0) >= 20 || Number((await redis("GET", P + kUser)) || 0) >= 10)
        return send(res, 429, { error: "Çok fazla yanlış deneme, 1 saat sonra tekrar dene." });
      const raw = USER_RE.test(user) ? await redis("GET", `${P}login:${user}`) : null;
      const rec = raw ? JSON.parse(raw) : null;
      const good = rec && crypto.timingSafeEqual(Buffer.from(hashPass(pass, rec.s), "hex"), Buffer.from(rec.h, "hex"));
      if (!good) { await overLimit(kIp, 20, 3600); await overLimit(kUser, 10, 3600); return send(res, 401, { error: "Kullanıcı adı ya da şifre yanlış." }); }
      return send(res, 200, { code: rec.code, user });
    }

    if (b.action === "google") {
      if (await overLimit(`rl:g:${ip}:${new Date().toISOString().slice(0, 13)}`, 40, 3600)) return send(res, 429, { error: "Çok sık deneme, birazdan tekrar dene." });
      const g = await verifyGoogle(b.credential);
      const linked = await redis("GET", `${P}g:${g.sub}`);
      if (b.code) {
        const code = await existingCode(b.code);
        if (linked && linked !== code) return send(res, 409, { error: "Bu Google hesabı başka bir hesaba bağlı." });
        if (await redis("GET", `${P}gof:${code}`) && !linked) return send(res, 409, { error: "Bu hesaba zaten başka bir Google hesabı bağlı." });
        await redis("SET", `${P}g:${g.sub}`, code); await redis("SET", `${P}gof:${code}`, g.email || "Google");
        return send(res, 200, { code, email: g.email });
      }
      if (linked && (await redis("EXISTS", `${P}u:${linked}`))) return send(res, 200, { code: linked, email: g.email });
      const code = await createAccount(req);
      await redis("SET", `${P}g:${g.sub}`, code); await redis("SET", `${P}gof:${code}`, g.email || "Google");
      return send(res, 200, { code, email: g.email, created: true });
    }

    if (b.action === "whoami") {
      const code = await existingCode(b.code);
      return send(res, 200, { user: (await redis("GET", `${P}userof:${code}`)) || "", google: (await redis("GET", `${P}gof:${code}`)) || "" });
    }

    send(res, 400, { error: "Bilinmeyen işlem." });
  } catch (e) {
    if (Array.isArray(e)) return send(res, e[0], { error: e[1] });
    send(res, 500, { error: e.message });
  }
};
