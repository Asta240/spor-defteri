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
- Yemekler öğünlü (`m`: k/o/a/s, `MEALS`, `mealSeg`); boş aramada öneri yok. Ölçüler `root.meas[gün]={solkol,sagkol,omuz,gogus,bel}`, ayda bir ana sayfa uyarısı (`measSnooze` 7 gün).
- Kas haritası: kendi SVG'miz `bodySvg` (`MUS` free-exercise-db kasları); kart/kütüphane küçük görseli kas haritası, detayda fotoğraflı yapılış + kaslar. Bugünkü antrenman seçimi/kardiyo Kartlar sayfasının üstünde (`woT`, `caT`); `hareket` sayfası = Kilo ve ölçüler.
- Makrolar: `FOODS` = [ad, porsiyon, kcal, protein, fastfood(0/1), yağ, karb]; yemek kaydı {n,k,p,y,c,m}. Hedef yağ `goals.y` / karb `goals.c` boşsa otomatik (`goalY` %28 kalori, `goalC` kalan). Kalori alımında P/K/Y çubukları + `foodTip` önerisi. Foto kodu YMK1 artık [ad,kcal,p,yağ,karb] (artifact güncel).
- Takviyeler sayfası `supp` (tarihli): `root.supp=[{id,name,dose}]`, gün `sp:{id:true}`, seri `suppStreak`, 7 gün noktaları, hazır liste `SUPP_PRE`.
- Kartlar sayfası: üstte "Hazır kartlardan ekle / + Yeni kart", sonra Bugün kartı, kompakt kart listesi (`.ccard`, aktifse "Aktif · %"). Karta basınca ayrı kart sayfası (`cardPage`, "‹ Kartlar" geri). Menüden Kartlar'a gelince liste.
- Hareket detayı: `FEEL[id]` = [nerede hissetmeli, nasıl hissettirmeli, yaygın hata] + `GEN_TIP[grup]` nefes/tempo.
- Su sayfası: bardak görseli (`wFill`), son 7 gün çubukları, su hatırlatması burada (`gwr`).
- Menü üstünde profil (`dProf`: baş harf, ad, boy·kilo) → Hesap. Hesap sayfası PC'de iki sütun.
- Seriler + rozetler: `streak(ok)` (bugün tutmadıysa dünden sayar), `okWo` (antrenman ya da boş gün) / `okWater` / `okProt`; ana sayfa `#ozStreak` (`renderStreaks`), İlerleme `#bdGrid` (`renderBadges`), 17 rozet `badgeList()`, kazanılan tarih `root.badges`, yeni rozette toast (`checkBadges`).
- Tema: koyu + turuncu vurgu (`--accent:#ff9f1c`), su mavisi #4dabf7. Emoji YOK: çizgi ikonlar `ICONS` + `I(ad)`; statik HTML’de `<i data-i="ad">` → `fillIcons()`. Toast/bildirim metinleri ikonsuz düz yazı.
- Alışkanlıklar sayfası `hab` (tarihli): `root.habits=[{id,name}]`, gün `hb:{id:true}`, `HAB_PRE` hazır liste, seri `habStreak`. Ana sayfa `#ozTrack` (`renderTrack`): alışkanlık + takviye çipleri, dokununca işaretler; listeler boşsa gizli. Rozet `hb7`.
- Salon takvimi + haftalık çubuklar İlerleme’de (`renderGym`, `calM`); günler `d.wo`’dan. Ana sayfa seçili kartta hareket kutucukları (`.xtiles`, x/y set), Seriler kutusunda bu hafta/bu ay salon günü.
- Tarih çubuğu: tarihe basınca takvim (`dpick`), bugünden farklıysa "Bugün" tuşu (`toToday`). Kilo ve ölçüler: ölçüler sol kol/sağ kol/omuz/göğüs/bel; Vücut analizi `renderBody` (BMI, sağlıklı aralık, tahmini yağ %, bel/boy, omuz/bel, kol farkı + öneriler).
- Görevler (`#ozTasks`, `renderTasks`, Günlük/Haftalık sekme `taskTab`): günlük `dailyTasks` (su, protein, kalori ±%10, adım, antrenman/boş gün, alışkanlıklar), haftalık `weeklyTasks` (3 antrenman, 5 gün su, 5 gün protein, haftalık adım, 2 tartı). Mükemmel gün/hafta rozetleri. Toplam 37 rozet.
- Geçmiş güne antrenman (ana sayfa, bugün değilse `#ozWo`): kart → "Direkt ekle" (`data-pastadd`, set×3 dk kcal) ya da "Detaylı gir" (`data-pastdet`: set set kg/tekrar + süre → lifts + d.wo + d.wk), "Boş gün", "Kaldır".
- Kardiyo kutusu `#ozCardio` (`renderCardio`): tür/süre/hız/eğim → `cardioKcal` (bant/dışarı ACSM net, diğerleri MET) → `d.cardio[]`, `d.ck` (yakılana eklenir), `d.ca` toplam dk (`syncCardio`).
- Tamamlanan işaretler yeşil değil turuncu (Yasin istedi).
- Kalori alımı: "Yemek ekle" kartında öğün + sekme (Listeden / Elle / Fotoğraf, `data-at`/`data-ap`); "Bu gün yediklerin" öğün kutuları (`.meal`, boş öğünde "+ Ekle" `data-addmeal`). Kalori yakımı: özet (toplam/yenen/açık + dağılım çubuğu) + Bazal, Adım, Antrenman ve kardiyo, Ekstra kutuları.
- Sayfa yenilenince son sayfa açılır (localStorage `sd-tab`, kart sayfası `sd-cardpage`). PC ana sayfa 3 sütun: halkalar (2 sütun) + Görevler sağ üstte; altında Antrenman | Kardiyo | Seriler; sonra Bugünkü takip. Ölçüler kaydedilirken o günün kilosu `meas[gün]._kg`; önceki ölçümle karşılaştırma tablosu + kiloyla birlikte yorum.
- Yediklerin: boş öğünler gizli, altta "Ekle: Kahvaltı/Akşam…" kısayolları; öğünsüz eski kayıtlarda öğün seçici (`data-mv`); eski "📷" adlar ikonla gösterilir.
- Özet halkaları gruplu: Beslenme (kalori/protein/su) | Aktivite (adım/yakılan) | Denge (`RG()`). Kalori alımı özeti: Kalori | Makrolar kutuları + "Öğünlere göre" (öğün payı çubuğu + kcal/%/P/K/Y tablosu). Hedefler + Antrenman bölümü: `goals.woW` (haftada antrenman), `caW` (haftalık kardiyo dk), `weW` (tartılma), `kgW` (haftalık kilo değişimi) → haftalık görevler ve kilo sayfası. Görevlerde Bugünün/Haftanın rozeti (`targetBadge`).
- Alışkanlıklar sayfası: üstte özet (bugün x/y, bu hafta %, en uzun seri), alışkanlıklar Sabah / Gün içi / Akşam bölümlerinde (`x.t` ya da addan tahmin `habSeg`), eklerken bölüm seçilir.
- İlerleme sekmeleri (`progTab`, localStorage `sd-ptab`): Genel / Antrenman / Beslenme / Vücut / Alışkanlıklar / Takviyeler / Rozetler; kartlar `data-pt`. Her şey için seri kartı `skItem` (şu anki seri, en uzun, son 30 gün % + 30 günlük ısı haritası); Vücut’ta ölçüm geçmişi tablosu.
- Kilo artırma önerisi `overload(id, hedefTekrar)`: son kayıtta en ağır setler hedef tekrara ulaştıysa +2,5 kg (dambıl/izole +1), 2 kez ulaşamadıysa %10 düş, yoksa kal. Antrenman ekranında (Uygula → tamamlanmamış setlere kg) ve kart sayfasında.
- Haftanın özeti `weekReview/weekReviewHtml`: Pazar 17:00 sonrası ve Pazartesi ana sayfada (`#ozWeek`, ✕ ile `root.wkSeen[pazartesi]`), İlerleme → Genel’de her zaman (`#pgWeek`). İyi gidenler / Dikkat / Gelecek hafta.
- Boş gün antrenman sayılmaz: okWo sadece d.wo; antrenman serisi haftalık (woWeekOk/woWeekStreak/woWeekBest, goals.woW); takvimde boş gün kesik çerçeve + açıklama.
- Kas yorgunluğu: `fatigue()`/`renderFatigue()` (İlerleme → Antrenman, #fgBox): son 4 gün, birincil kas set başı 1, yardımcı 0,5, günde %25 azalır; `bodySvg` artık renk fonksiyonu da alır (f1/f2/f3).
- Birleşik grafik: `renderCombo()` (#cmFig, Genel + Vücut): kilo/kalori/adım son 30 gün, her biri kendi aralığına ölçekli, dokununca o günün değerleri.
- Hareket notları: `root.exNotes={exId: metin}`; showEx'te textarea, kart listesinde ve antrenmanda gösterilir.
- Yenilikler penceresi: `NEWS={id, items}` + `maybeNews()`; açılışta bir kez, "Tamam" → `root.newsSeen` (+ localStorage `sd-news`). Yeni hesap görmez. Yeni yenilikte NEWS.id'yi değiştir. Update log sayfası YOK (Yasin istemedi).
- Su boyları: `WSIZES` (bardak 250, çay bardağı 100, büyük bardak 400, yarım L 500, 1 L, 1,5 L) → `addMl(ml)`; `d.w` hâlâ bardak (250 ml) cinsinden, ondalıklı olabilir (`wR`, `wN`); `d.wl` eklenen ml listesi, "Son ekleneni geri al" sondan çıkarır.
- Görevler sayfası: menüde hedef ikonu (`gorev` → #vGorev/#gvTasks). Ana sayfada görev kartı YOK; sağ üstte hamburger gibi hedef butonu (#taskBtn, sadece ozet sekmesinde) Görevler sayfasını açar. Hedefler ikonu `sliders`.
- Menü butonu aşağı kayınca sabit kalır (`body.scrolled #menuBtn`, scrollY > 70).
- Kalan alınacak kalori: "Yemek ekle" başlığında (#addLeft) ve yemek ekleme penceresinde "Ekleyince kalan" (#mulLeft).
- Kan tahlili (Kilo ve ölçüler sayfası, en altta): `root.labs={"YYYY-MM-DD":{anahtar:değer}}`, `LABS` (gruplar, birim, aralık; ferritin/demir/Hb/HDL cinsiyete göre), `labSt` (l/b/n/h), `labTips` öneriler, `renderLabs()`. Tarih çipleriyle eski tahliller, önceki değerle kıyas.
- Foto kalori prompt: fotoğraflar numaralı (Foto 1, 2…); "kalan/artan" notu ya da önce/sonra fotoğrafında yenen = başlangıç − kalan yazılır.
- Foto/veri linki (#ymk=, #veri=) artık ilk poll() bittikten sonra eklenir; önceden eski önbelleğe eklenip sunucudaki hal tarafından eziliyordu (iki kere basmak gerekiyordu).
- Alışkanlık sıklığı: `habit.f` boş = her gün, 1–6 = haftada X gün (`habW`, `habWeekN`, `habWeekOk`). Günlük görev "Günlük alışkanlıklar" sadece her günküler; haftalıklar `weeklyTasks`a girer; seri hafta cinsinden (`wkStreakOf/wkBestOf`, genel haftalık seri yardımcıları). Kartta `.hfq` seçici, ekleme formunda `#hbFreq`.
- Antrenmanda "Tüm setlere aynı kilo" (data-samekg): en son kilosu değiştirilen setin (kgSrc) ya da ilk dolu setin kilosunu bütün setlere yazar.
- Dambıl açıklaması: `DB_KIND` (p = iki dambıl, b = tek dambıl iki elle, o = tek kol) + `dbHint()` antrenmanda set tablosunun altında; iki dambıllı harekette başlık "kg (tek el)" ve toplam kilo yazar.
- Antrenman sırasında "‹ Kartlar" (data-tolist → listOverride=true) kart listesine döner; üstte "Aktif antrenman · Devam et". Başka kartta "Başlat" → onay (aktif iptal olur); aynı kartta "Başlat" → devam eder (sıfırlamaz).
- Incline yürüyüş (Walking_Treadmill) antrenmanda Eğim % ve Hız km/s (x.inc/x.spd, data-trd); bitirince ACSM ile kalori (cardioKcal "tread"); lifts kaydında {inc, spd}, liftText gösterir, sonraki seferde dolu gelir.
- Antrenmanda set silme: her setin yanında küçük ✕ (data-setx), tek set kalınca gizli. Tamamlanan set butonu turuncu (.done).
- Gelişmeyen hareketler: `plateaus()` (son 8 hafta ≥3 kayıt, son 3'ü ≥10 gün, tahmini 1RM %1'den fazla artmamış), `PL_PAT`/`PL_INFO` (zayıf halka + odak), `plReasons` (protein/kalori/sıklık/aynı tekrar). Antrenman sayfasında kas yorgunluğuyla yan yana (#plBox, #fgBox). İlerleme'de Genel sekmesi kaldırıldı (varsayılan antrenman). Kartlar sayfası adı "Antrenman".
- Kardiyo ana sayfadan kalktı. Antrenman sayfasında "Kardiyo" kartı (cardPage "__cardio", `renderCardio(box, ds)` bugüne yazar). Antrenman ekranında "+ Kardiyo ekle" (`session.cardio`, data-scd/data-scdx/data-scdadd); bitirince kalori toplu gösterilir, kardiyolar d.cardio'ya eklenir (d.wk = ağırlık + kart içi kardiyo hareketleri, d.ck = kardiyolar).
- İlerleme sekmeleri: antrenman, beslenme, vucut, aliskanlik, takviye, rozet, haftalik (eski "genel" kartları: haftanın özeti, haftalık rapor, bütün seriler → haftalik).
