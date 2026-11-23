# Spor Defteri — Yas (devir notu)

Kişisel proje: imza **Yas** (CardiacAI değil; CardiacAI sadece Sınav Asistanı'nın grup adı).

Yasin'in kişisel kalori/su/antrenman takip sitesi. Sınav Haftası Asistanı (repo Asta240/sinav-asistani) ile aynı altyapı ve görünüm.

## Çalışma kuralları
- **Yasin'in istemediği özelliği ekleme.** Gerekiyorsa önce sor.
- Cevaplar Türkçe, kısa, adım adım. Değişiklikten sonra ne değiştiğini maddelerle söyle.
- Her değişikliği test et (headless Chrome + sahte API), sonra commit ve **doğrudan main'e push et** (önizleme dalı YOK, Yasin istemiyor). Site Vercel'de (main'den otomatik yayın; TR'de VPN gerekir, Yasin için sorun değil).
- **Sınav Asistanı (ayrı repo) bu kurala dahil değil:** orada sadece `onizleme` dalına at, Yasin açıkça "Sınav Asistanı'nı yayınla" demeden main'e asla push etme.

## Yapı
- `index.html` tek dosya. Sol üstte ☰ menü (`#drawer`, `openDrawer/closeDrawer`), sayfalar `VIEWS` + `setTab(key)`: ozet (Günün özeti, ana sayfa: halkalar + sıradaki antrenman `renderHomeWo()` + Hedefler), yemek, su, hareket (bu dördü tarihli, ortak `#datebar`, hepsini `renderDay()` çizer), cards (`renderCards`, antrenman modu `renderSession`), lib (`renderLib`, detay `showEx`), prog (`renderProg`, `drawLift`).
- Ana sayfa özet kartında Gün | Hafta seçici (`sumMode`, localStorage `sd-sum`). Hafta = seçili günün Pazartesi–Pazar haftası (`renderWeekSum()`): halkalar günlük ortalama (sadece kayıtlı günler), toplam açık, antrenman günü, kilo değişimi, 7 günlük kalori çubukları. Halkalar tıklanınca sayfa açar (gün: kalori/protein → yemek, su → su; hafta → ilerleme).
- Ana sayfa antrenmanı (`renderHomeWo`, hareket listesi YOK): bugün seçim yoksa "Bugün ne yapıyorsun?" (bütün kartlar + 😴 Boş gün, sıradaki `nextCard()` vurgulu). Kart seçilince (`root.pick`) sadece o kart: ilerleme (`woProgress`: set, hareket, toplam kg; oturumdan ya da bugünkü `lifts`ten), "Antrenmana başla / devam et / Karta git →" (`data-gocard` → oturumu başlatır + `goCard`), "Detay girmeden yaptım say" (`markDone`) ya da oturumda "Antrenmanı bitirdim ✓" (`finishSession`), yapıldıysa yeşil tuş dokununca geri alır. Boş gün `d.rest=true`. Ana sayfada her gün görünen adım + yakılan kutusu `#ozMove` (`#ozSteps` → `d.st`, `#ozBurn` → `d.bu`). "Değiştir" seçime döner (yapıldı kaydını onayla siler). `goCard(id)`: Kartlar'da o kartı açar; aktif antrenman başka karttaysa `listOverride` + "Devam et" şeridi.
- Hafta modunda ‹ › 7 gün kayar (`weekMode()`), tarih çubuğu hafta aralığını yazar; çubuğa (`.wd[data-day]`) basınca Gün moduna o günle geçer (`openDay`). Her harekette kilo seçici (−/+ 2,5 kg, elle de yazılır) ve ✓ Yaptım; ilk dokunuşta oturum kendiliğinden başlar (`homeSession()`). "Bitir ve kaydet" sadece ✓ işaretli setleri ağırlık defterine yazar.
- Bilgisayarda (≥1000px) tam genişlik: `.wrap` 1320px, özet/yemek/kartlar/ilerleme iki sütun.
- Yemek sayfası: hazır yemek listesi `FOODS` ([ad, porsiyon, kcal, protein], `POPULAR` boş aramada görünür, porsiyon çarpanı ½–3), elle ekleme, fotoğraf kodu.
- Fotoğraftan kalori: claude.ai sayfası `FOTO_URL` = https://claude.ai/artifact/HVWojZ4iDYbMFdYLVAc9kw (kaynağı `extras/foto-kalori/index.html`, `sample` + görsel izni). Sonuç kodu `YMK1.<base64url JSON [[ad,kcal,protein],...]>`; `SPOR_URL/#ymk=KOD` linkiyle gelir (giriş yapılmamışsa localStorage `sd-pending-ymk`'de bekler) ya da Yemek → Kod yapıştır. `importYmk()` bugünün yemeklerine 📷 ile ekler.
- Veri aktarma linki: `SPOR_URL/#veri=VRI1.<base64url JSON {days:{...}}>` → giriş yapılınca onay sorar, `mergeVeri()` ile ekler (var olan silinmez, aynı ad+kcal yemek tekrar eklenmez, boş alanlar doldurulur). `#ymk=`/`#veri=` site açıkken de çalışır (`hashchange`).
- Hareket görselleri durgun; `.anim`'e tıklayınca `.play` sınıfıyla oynar, tekrar tıklayınca durur (kütüphane ızgarasında tıklama detayı açar).
- Veri: `root = {goals:{k,p,w}, days:{"YYYY-MM-DD":{f:[{n,k,p}], w, wo, ca, st, bu, kg}}, cards:[{id,name,ex:[{id,s,r}]}], lifts:{exId:[{d, s:[[kg,tekrar],...]}]}, session}`.
- Kayıt: `save()` → localStorage `sd-root-KOD` + 1,2 sn sonra `PUT /api/data` (base sürüm; 409 → sunucudaki hali yüklenir). 30 sn'de bir ve sekmeye dönünce `poll()`.
- Kod `LOCAL` = kodsuz, sadece cihazda.
- Giriş (`api/auth.js`): kayıt = kullanıcı adı + e-posta + şifre, giriş = kullanıcı adı + şifre (scrypt), Google ile giriş (GSI, sunucu `tokeninfo` ile doğrular; env `GOOGLE_CLIENT_ID` yoksa buton gizli). Hepsi hesabın 4 haneli koduna eşlenir: `fit:login:<ad>` {s,h,code,email}, `fit:email:<eposta>`→ad, `fit:userof:<kod>`→ad, `fit:g:<sub>`→kod, `fit:gof:<kod>`→gmail. Eski kodla giriş yedek olarak duruyor; hesap penceresinden (`codeBtn`) kodlu hesaba ad/şifre ya da Google bağlanır. localStorage `sd-user` = ekranda görünen ad.
- API: `api/new.js`, `api/data.js` (Vercel fonksiyonları). Kendi ayrı Upstash veritabanı (Vercel Storage → Upstash, env `KV_REST_API_URL`/`KV_REST_API_TOKEN`). Anahtarlar `fit:` önekli.
- Hareketler `EX` dizisinde; görseller `img/<id>/0.jpg,1.jpg` (free-exercise-db, kamu malı). Video: YouTube arama linki (`yt()`).
- Hazır kartlar `defaultCards()` (salonun İtiş/Çekiş/Bacak+Karın programı + Kol+Karın) sadece yeni hesaba gelir.
