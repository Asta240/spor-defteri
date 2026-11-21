// GET /api/data?code=XXXX         → o kodun verisi + sürüm (updatedAt)
// PUT /api/data {code, json, base} → kaydet. base = cihazın bildiği son sürüm.
//     Sunucudaki sürüm farklıysa (başka cihaz daha önce kaydetmiş) 409 + güncel veri döner.
const { redis, P, CODE_RE, cleanCode, ipOf, overLimit, send } = require("./_lib");
const MAX = 900 * 1024; // ~900 KB

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const code = cleanCode(req.query?.code ?? new URL(req.url, "http://x").searchParams.get("code"));
      if (!CODE_RE.test(code)) return send(res, 404, { error: "Bu kod bulunamadı." });
      // Kod tahminine karşı: saatte 30 yanlış denemeden sonra engelle
      const missKey = `rl:miss:${ipOf(req)}:${new Date().toISOString().slice(0, 13)}`;
      if (Number((await redis("GET", P + missKey)) || 0) >= 30)
        return send(res, 429, { error: "Çok fazla yanlış kod denendi, 1 saat sonra tekrar dene." });
      const raw = await redis("GET", `${P}u:${code}`);
      if (!raw) { await overLimit(missKey, 30, 3600); return send(res, 404, { error: "Bu kod bulunamadı." }); }
      const d = JSON.parse(raw);
      return send(res, 200, { code, json: d.json, updatedAt: d.updatedAt || 0 });
    }
    if (req.method === "PUT") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const code = cleanCode(b.code);
      if (!CODE_RE.test(code)) return send(res, 400, { error: "Geçersiz kod." });
      if (typeof b.json !== "string" || b.json.length > MAX) return send(res, 413, { error: "Veri çok büyük." });
      if (await overLimit(`rl:put:${code}:${new Date().toISOString().slice(0, 16)}`, 40, 60))
        return send(res, 429, { error: "Çok sık kayıt, birazdan tekrar dene." });
      const raw = await redis("GET", `${P}u:${code}`);
      if (!raw) return send(res, 404, { error: "Bu kod bulunamadı." });
      const cur = JSON.parse(raw);
      const curV = cur.updatedAt || 0;
      if (cur.json && Number(b.base || 0) !== curV) return send(res, 409, { json: cur.json, updatedAt: curV });
      const v = Math.max(Date.now(), curV + 1); // sürüm = sunucu zamanı
      await redis("SET", `${P}u:${code}`, JSON.stringify({ json: b.json, updatedAt: v }));
      return send(res, 200, { ok: true, updatedAt: v });
    }
    send(res, 405, { error: "GET veya PUT kullan" });
  } catch (e) { send(res, 500, { error: e.message }); }
};
