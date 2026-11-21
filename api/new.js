// POST /api/new → yeni 4 haneli kod üretir ve boş kayıt açar
const { redis, P, newCode, ipOf, overLimit, send, today } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "POST kullan" });
  try {
    // Aynı internet bağlantısından günde en fazla 20 yeni kod
    if (await overLimit(`rl:new:${ipOf(req)}:${today()}`, 20, 86400))
      return send(res, 429, { error: "Bugün çok fazla yeni kod alındı, yarın tekrar dene." });
    for (let i = 0; i < 8; i++) {
      const code = newCode();
      const ok = await redis("SET", `${P}u:${code}`, JSON.stringify({ json: null, updatedAt: 0 }), "NX");
      if (ok === "OK") return send(res, 200, { code });
    }
    send(res, 500, { error: "Kod üretilemedi, tekrar dene." });
  } catch (e) { send(res, 500, { error: e.message }); }
};
