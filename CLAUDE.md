# Spor Defteri — CardiacAI (devir notu)

Yasin'in kişisel kalori/su/antrenman takip sitesi. Sınav Haftası Asistanı (repo Asta240/sinav-asistani) ile aynı altyapı ve görünüm.

## Çalışma kuralları
- **Yasin'in istemediği özelliği ekleme.** Gerekiyorsa önce sor.
- Cevaplar Türkçe, kısa, adım adım. Değişiklikten sonra ne değiştiğini maddelerle söyle.
- Her değişikliği test et (headless Chrome + sahte API), sonra commit; push'u Yasin "yayınla" deyince yap. Site Vercel'de (main'den otomatik yayın; TR'de VPN gerekir, Yasin için sorun değil).

## Yapı
- `index.html` tek dosya. Sekmeler: Bugün (`renderToday`), Kartlar (`renderCards`, antrenman modu `renderSession`), Hareketler (`renderLib`, detay `showEx`), İlerleme (`renderProg`, `drawLift`).
- Veri: `root = {goals:{k,p,w}, days:{"YYYY-MM-DD":{f:[{n,k,p}], w, wo, ca, st, bu, kg}}, cards:[{id,name,ex:[{id,s,r}]}], lifts:{exId:[{d, s:[[kg,tekrar],...]}]}, session}`.
- Kayıt: `save()` → localStorage `sd-root-KOD` + 1,2 sn sonra `PUT /api/data` (base sürüm; 409 → sunucudaki hali yüklenir). 30 sn'de bir ve sekmeye dönünce `poll()`.
- Kod `LOCAL` = kodsuz, sadece cihazda.
- Giriş (`api/auth.js`): kayıt = kullanıcı adı + e-posta + şifre, giriş = kullanıcı adı + şifre (scrypt), Google ile giriş (GSI, sunucu `tokeninfo` ile doğrular; env `GOOGLE_CLIENT_ID` yoksa buton gizli). Hepsi hesabın 4 haneli koduna eşlenir: `fit:login:<ad>` {s,h,code,email}, `fit:email:<eposta>`→ad, `fit:userof:<kod>`→ad, `fit:g:<sub>`→kod, `fit:gof:<kod>`→gmail. Eski kodla giriş yedek olarak duruyor; hesap penceresinden (`codeBtn`) kodlu hesaba ad/şifre ya da Google bağlanır. localStorage `sd-user` = ekranda görünen ad.
- Önizleme: `git push origin main:onizleme` → Vercel önizleme adresi (ücretsiz). Asıl site main.
- API: `api/new.js`, `api/data.js` (Vercel fonksiyonları). Kendi ayrı Upstash veritabanı (Vercel Storage → Upstash, env `KV_REST_API_URL`/`KV_REST_API_TOKEN`). Anahtarlar `fit:` önekli.
- Hareketler `EX` dizisinde; görseller `img/<id>/0.jpg,1.jpg` (free-exercise-db, kamu malı). Video: YouTube arama linki (`yt()`).
- Hazır kartlar `defaultCards()` (salonun İtiş/Çekiş/Bacak+Karın programı + Kol+Karın) sadece yeni hesaba gelir.
