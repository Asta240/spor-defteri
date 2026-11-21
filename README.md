# Spor Defteri · CardiacAI

Kalori, protein, su, adım takibi + antrenman kartları + ağırlık defteri + kilo takibi.
Sınav Haftası Asistanı ile aynı altyapı (4 haneli kodla giriş), ama **kendi ayrı veritabanı** var. Site Vercel'de, veritabanı Upstash'te. İkisi de ücretsiz, kart istemez.
Not: vercel.app Türkiye'de VPN'siz açılmıyor.

## Kurulum (yaklaşık 10 dk)

1. **GitHub**: github.com → sağ üst `+` → **New repository** → adı `spor-defteri` → **Create repository**.
2. Açılan sayfada **uploading an existing file** → bu klasördeki **her şeyi** sürükle (`img` ve `api` klasörleri dahil) → **Commit changes**.
3. **Vercel**: vercel.com → **Add New… → Project** → `spor-defteri` yanında **Import** → hiçbir ayarı değiştirmeden **Deploy**.
4. **Veritabanı**: Vercel'de projeyi aç → **Storage** sekmesi → **Create Database** → **Upstash** (Redis) → ücretsiz plan → adı `spor-defteri` → oluştur → projeye **Connect**.
5. **Deployments** sekmesi → en üstteki → `⋯` → **Redeploy** (veritabanı bilgileri aktif olsun diye).
6. Proje sayfasındaki link (ör. `spor-defteri.vercel.app`) senin siten. Telefonda açıp **Ana ekrana ekle** dersen uygulama gibi açılır.

## Dosyalar
- `index.html`: sitenin tamamı (tek dosya)
- `img/<HareketAdı>/0.jpg, 1.jpg`: hareketin başlangıç ve bitiş fotoğrafı, sitede dönüşümlü oynar
- `api/new.js` yeni kod, `api/data.js` veri okuma/kaydetme, `api/_lib.js` veritabanı bağlantısı
- `vercel.json`: fotoğrafların önbellek ayarı
- `manifest.webmanifest`, `sw.js`, `icon-*.png`: telefona "uygulama gibi" ekleme

## Yeni hareket eklemek
`index.html` içinde `const EX = [` listesine bir satır ekle:
```js
{id:"Klasör_Adı", tr:"Türkçe ad", en:"youtube arama", g:"Göğüs", s:3, r:10,
 how:["1. adım","2. adım","3. adım"], tip:"Kısa ipucu"},
```
Fotoğraflar için `img/Klasör_Adı/0.jpg` ve `1.jpg` koy. Hazır 870+ hareketlik fotoğraf arşivi: https://github.com/yuhonas/free-exercise-db (kamu malı, `exercises/` klasörü).

## Hareket fotoğrafları
free-exercise-db (Unlicense, kamu malı). İstediğin gibi kullanılabilir.
