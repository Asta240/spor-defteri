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
- Yeni hesaba kart YÜKLENMEZ (`defaultCards()` boş). Kartlar sayfasında ve kartsız ana sayfada "✦ Hazır kartlardan ekle" → `showTemplates()`: `TEMPLATES` (Claude'un hazırladığı 7 program: Yeni başlayan tam vücut A/B, İtiş·Çekiş·Bacak (+Kol+Karın), Üst/Alt, Kol ve omuz, Karın, Vücut ağırlığı, Kardiyo + karın). Tek kart "Ekle" ya da "Hepsini ekle"; aynı adlı kart varsa "(2)" eklenir (`addTemplateCard`). Herkes ayrıca "+ Yeni kart" ile kendi kartını kurar.
- Telefonda çift dokunma yakınlaştırmaz: `*{touch-action:manipulation}`; inputlar 16px (odakta yakınlaştırma da yok).

## Vücut bilgileri + BMR
- `root.profile = {h, w, by, sex, wd}` (kayıtta istenir; Hesap → Vücut bilgileri `profForm/bindProf`; `wd` = kilonun girildiği gün).
- Yakılan girilmemiş günlerde `burnedOf(ds)` BMR + adım kcal (`stepKcal`: adım × kilo × 0,0005) yazar. "tahmini"/"~" yok (Yasin istemedi). Yakılanın altında her zaman "BMR X + adım Y" (`.bmrl`).
- Hedefler: `goals.st` (adım, 8000) ve `goals.bu` (yakılan, 2500); ana sayfada Adım + Yakılan halkaları (haftada ortalama).
- Sayfalar: `kalori` (Kalori hesabı: sadece günlük adım/ekstra `d.xb`/Fitness girilir `calcIn`, kişisel bilgi burada düzenlenmez (Hesap penceresinde); hesap = BMR + adım + xb; `renderCalc`: vücut, BMR formülü, adım kcal, toplam, Fitness, açık), `adim` (Adım: sadece `#st`; Fitness yakılanı Kalori hesabında `cBu`), `hedef` (alt alta, tüm hedefler gk/gp/gw/gst/gbu), `hareket` = Antrenman ve kilo. Ana sayfada 5 halka tek sırada (yazı `cqw` ile halkaya göre ölçeklenir).
- Menü grupları: Günün özeti / Kalori hesabı / Hedefler · GÜNLÜK GİRİŞ (yemek, su, adım, antrenman ve kilo; burada hedef girilmez) · ANTRENMAN (kartlar, hareketler, ilerleme).
- Ana sayfa uyarıları (`#ozMove`, uyarı yoksa gizli): dünün adımı yoksa `#ozYest` (adımı düne yazar); son tartı (`lastWeighDay`) ≥3 gün önceyse `#ozKg` (bugünün kg + profil kilosu).
- Fast food: `FOODS` 5. eleman 1 → ekleme penceresinde `EXTRAS` (sos, peynir, menü; menüler birbirini dışlar). İçecekler listesi FOODS sonunda.
- Kartlar: normalde sadece görüntüleme; ✏️ Düzenle (`editCard`) ile set/tekrar, sıra, çıkarma, hareket ekleme, ad, silme. Antrenman modunda kg/tekrar her zaman girilir.
- Menü: Kalori grubu = 🍽️ Kalori alımı (`yemek`, 📷 Fotoğraf arama satırında) + 🔥 Kalori yakımı (`kalori`); iki sayfanın üstünde `.kseg` sekmesi.
- Antrenman ve kilo sayfası `renderHareket`: antrenman durumu, büyük kilo + öncekine göre fark + son 30 tartı çizgisi.
- EX 77 hareket (38 yeni, görseller img/). Popeyes değerleri Yasin'in verdiği Popchicken 692 kcal'e göre yükseltildi.
- Fotoğraftan Kalori artifact'inin prompt'u: düşük tahmin etme + zincir fast food referans değerleri (artifact'te ve extras/foto-kalori'de aynı).
- Apple Sağlık adım senkronu: `api/steps.js` (anahtar `fit:stok:<t>`→kod, `fit:stokof:<kod>`; GET `?t=&s=` o günün `st`'sini sunucu verisine yazar, Türkiye saati). Hesap sayfası → "🍎 Apple Sağlık" (`showHealthSync`) kestirme tarifini gösterir.
- Hesap artık ayrı sayfa (`hesap`, `renderAccount`); menüde "Fotoğraftan kalori" yok (📷 Kalori alımında).
- Hedefler: `goals.kgT` hedef kilo (Kilo sayfasında kalan + hız), `root.waterRem` su hatırlatması saat (site açıkken bildirim / ana sayfada uyarı, `waterDue`).
- Antrenman bitirince `finishSession` pencere açar: ağırlık süresi (gerçek süre ya da set×3 dk) + kardiyo türü/dk → `workoutKcal` (MET−1)×kg×saat → `d.wk` (yakılana eklenir), `commitSession`. Rekor `bestOf`, toast.
- İlerleme: Haftalık rapor (`renderReport`, bu hafta vs geçen), Hareketlerde gelişim (ilk→son), Rekorlar.
- Yemekler öğünlü (`m`: k/o/a/s, `MEALS`, `mealSeg`); boş aramada öneri yok. Ölçüler `root.meas[gün]={bel,kol,gogus,kalca}`, ayda bir ana sayfa uyarısı (`measSnooze` 7 gün).
- Kas haritası: kendi SVG'miz `bodySvg` (`MUS` free-exercise-db kasları); kart/kütüphane küçük görseli kas haritası, detayda fotoğraflı yapılış + kaslar. Bugünkü antrenman seçimi/kardiyo Kartlar sayfasının üstünde (`woT`, `caT`); `hareket` sayfası = Kilo ve ölçüler.
- Makrolar: `FOODS` = [ad, porsiyon, kcal, protein, fastfood(0/1), yağ, karb]; yemek kaydı {n,k,p,y,c,m}. Hedef yağ `goals.y` / karb `goals.c` boşsa otomatik (`goalY` %28 kalori, `goalC` kalan). Kalori alımında P/K/Y çubukları + `foodTip` önerisi. Foto kodu YMK1 artık [ad,kcal,p,yağ,karb] (artifact güncel).
- Takviyeler sayfası `supp` (tarihli): `root.supp=[{id,name,dose}]`, gün `sp:{id:true}`, seri `suppStreak`, 7 gün noktaları, hazır liste `SUPP_PRE`.
- Kartlar sayfası: üstte "Hazır kartlardan ekle / + Yeni kart", sonra Bugün kartı, kompakt kart listesi (`.ccard`, aktifse "Aktif · %"). Karta basınca ayrı kart sayfası (`cardPage`, "‹ Kartlar" geri). Menüden Kartlar'a gelince liste.
- Hareket detayı: `FEEL[id]` = [nerede hissetmeli, nasıl hissettirmeli, yaygın hata] + `GEN_TIP[grup]` nefes/tempo.
- Su sayfası: bardak görseli (`wFill`), son 7 gün çubukları, su hatırlatması burada (`gwr`).
- Menü üstünde profil (`dProf`: baş harf, ad, boy·kilo) → Hesap. Hesap sayfası PC'de iki sütun.
- Seriler + rozetler: `streak(ok)` (bugün tutmadıysa dünden sayar), `okWo` (antrenman ya da boş gün) / `okWater` / `okProt`; ana sayfa `#ozStreak` (`renderStreaks`), İlerleme `#bdGrid` (`renderBadges`), 17 rozet `badgeList()`, kazanılan tarih `root.badges`, yeni rozette toast (`checkBadges`).
