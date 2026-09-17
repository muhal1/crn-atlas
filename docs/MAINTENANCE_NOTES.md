# Bakım Notları

Bu dosya, panel üzerinde daha sonra başka bir sohbette değişiklik yapılırken
hatırlanması gereken kararları ve tuzakları özetler. Yeni değişiklik yapmadan
önce `AGENTS.md` ile birlikte burayı da oku.

## Mevcut Kişisel Kurulum

- Aktif plan: Kontrol ve Otomasyon Mühendisliği Yüksek Lisans, `planId=2561`,
  `seviye=LU`.
- `veri/ayarlar.json` içinde kontrolle ilişkili ek branş havuzu tutulur.
  Mevcut havuz: `BBL`, `BLG`, `BVA`, `ELK`, `END`, `MAK`, `MAT`, `RBT`, `UUM`.
- `veri/gizlenen.json` kalıcı kişisel gizleme listesidir. Tarayıcı oturumuna
  bağlı değildir; panel açıldığında `/api/veri` ile yüklenir.
- `veri/secim.json` aktif program profillerini ve seçili CRN'leri tutar.

## ÖBS Veri Çekme

### Çoklu yüksek lisans programları

- Bölüm seçici `veri/programlar.json` listesini kullanır. Kontrol programının
  verileri eski `veri/{ayarlar,plan,dersler}.json` yollarında kalır.
- Uzay Mühendisliği İngilizce YL: `planId=2628`, ana branş `UZM`.
  Çevre Bilimleri Mühendisliği ve Yönetimi YL: `planId=2565`, ana branş `CBM`.
  Bu adlar güncel ÖBS ders planındaki resmi adlardır.
- Yeni iki programın açık dersleri `program_verisi.py` ile
  `veri/programlar/<id>/` altında üretilir. Uygun başka fakülte adayları
  `PROGRAMLAR` içindeki `ekBransKodlari` ile sınırlandırılır. Planın açıkça
  saydığı dersler bu sınırın dışında da korunur. Plan dışı derslerin kabulü
  danışman onayına bağlıdır; panel bunları kesin sayılır diye sunmamalıdır.
- Eylül 2026 kontrolünde Çevre planının `12848`, `12849`, `12850`, `12851`
  grup uç noktaları ÖBS'de HTTP 500 dönüyordu. İlk üçü zorunlu seçmeli ders
  listesi olduğundan `eksikKaynak` işaretli bırakılır, kullanıcıya uyarı
  gösterilir. `12851` LUS/serbest slotudur ve ders listesi olmadan da aday
  gösterilebilir. Zamanlanmış dağıtım planı tekrar dener ve ÖBS düzelirse
  eksik grupları tamamlar. Yeni sorgu daha fazla grup kaybederse önceki plan
  korunur. Elle yenilemek için `python program_verisi.py cevre` çalıştır;
  `--sadece-dersler` planı yeniden çekmez.
- Eksik kaynak uyarısı `#kaynakUyarisi` alanında kalıcıdır; geçici işlem
  bildirimleri `#uyari` alanını kullanır ve kalıcı uyarıyı kapatmamalıdır.
- Statik sitede bölüm bazlı kişisel durum, mevcut Supabase `user_profiles.secim`
  JSON alanındaki `aktifBolum` ve `bolumler` içinde tutulur. Eski tek bölümlü
  profil ilk okumada `kontrol` olarak yorumlanır. Ayrı şema değişikliği yoktur.
  Yerel sunucuda diğer bölümlerin durumları `dsp_bolumler` localStorage
  anahtarında tutulur; kontrol bölümünün eski JSON dosyaları korunur.
  Supabase kullanılmayan statik yerel kullanımda da her seçim ve branş
  filtresi değişikliğinde `dsp_bolumler` güncellenir; yalnızca bölüm
  değişiminde kaydetmek yenileme sonrası ders kaybına yol açar.
- JSON içe aktarma da aynı kalıcılık kuralını izler: statik uzak hesap
  Supabase'e, girişsiz statik kullanım `dsp_bolumler` anahtarına, yerel
  sunucudaki Kontrol bölümü ise `/api/alinan`, `/api/secim` ve
  `/api/gizlenen` uçlarına yazılır.
- Bölüm değişiminde gereksinim filtresi sıfırlanır. Önceki bölümün filtre
  seçimleri yeni bölümde dersleri görünmez kılmamalıdır.

```powershell
$env:PYTHONUTF8='1'
python program_verisi.py hepsi
python program_verisi.py hepsi --sadece-dersler
node --check web/app.js
python -m py_compile obs_client.py program_verisi.py server.py
```

- Lisansüstü planlarda `Seçime Bağlı Ders` satırları ÖBS'de boş ders listesiyle
  gelir; panel bunları `serbest=true` olarak yorumlar.
- `LUS`, lisansüstü seviyede kredili ders havuzu anlamına gelir. Bu nedenle
  sadece plan içinde açıkça yazan dersleri göstermek eksik sonuç üretir.
- `obs_client.py` içindeki `donem_derslerini_topla` fonksiyonu, planda serbest
  slot varsa istenen branşlardaki plan dışı dersleri de seçime bağlı adayı
  olarak tutmalıdır.
- Önemli hata: KOM planın kendi branşı olduğu için önce yalnızca planda geçen
  KOM dersleri alınıyordu. Oysa ÖBS'de açılan tüm KOM dersleri seçime bağlı
  aday havuzunda görünmelidir. 2026-2027 Güz kontrolünde KOM için 16 CRN vardı.
- Veri az görünürse önce `python panel.py guncelle` çıktısındaki aktif dönemi ve
  branş başına `x / y kayıt alındı` satırlarını kontrol et.
- Windows terminalinde Türkçe karakter yüzünden komut düşerse:

```powershell
$env:PYTHONUTF8='1'; python panel.py guncelle
```

## Gereksinim ve Filtre Adları

- Arayüzde ders paketleri için ders planındaki adlar esas alınır.
- Aynı havuzu temsil eden Roma rakamlı satırlar tek grupta gösterilir:
  `Zorunlu Seçmeli Ders I-III`, `Seçime Bağlı Ders I-IV`.
- `serbest seçmeli` veya `Plan dışı / serbest` gibi ayrı etiketler kullanma.
  Plan dışı LUS adayları da kullanıcıya `Seçime Bağlı Ders I-IV` olarak görünür.
- Ders listesi, öneri kutusu ve filtre menüsü aynı adlandırma helper'larını
  kullanmalıdır.
- Gereksinim rozet renkleri `gereksinimRozetRengi` fonksiyonu ile belirlenir:
  `Zorunlu Matematik Dersi` için kehribar/turuncu, `Zorunlu Seçmeli Ders` için
  mavi, `Seçime Bağlı Ders` için mor, seminer/tez için indigo, genel zorunlu için
  turkuaz kullanılır. Filtre menüsündeki gösterge noktaları da bu renkleri takip eder.

## Ders Listesi ve Gizleme

- Her ders satırında `Seç` ve `Gizle` butonları bulunur.
- Gizleme ders kodu bazındadır, CRN bazında değildir. Örneğin `KOM 505E`
  gizlenirse aynı kodun diğer şubesi de gizlenmiş sayılır.
- Bir ders gizlenirse aktif program profilinden de çıkarılır.
- Gizlenen dersler `Gizlenen Dersler` kutusunda listelenir ve `Göster`
  düğmesiyle geri alınır.
- Kullanıcının yapıştırdığı gizlenecek ders listelerinden yalnızca ders kodları
  ayıklanmalıdır. Ders adları veya `Göster` metinleri dosyaya yazılmamalıdır.

## Gereksinim Açılır Menüsü

- Eski tekli `<select>` yerine özel açılır menü kullanılır.
- Üstte gereksinim grubu checkbox'ları vardır; birden çok paket aynı anda açık
  olabilir.
- `Seçime Bağlı Ders I-IV` altında ders ders değil, branş kodu bazında alt
  checkbox'lar bulunur: ör. `KOM 16 ders`, `BLG 9 ders`.
- Alt branş filtresi tarayıcıda `localStorage` ile saklanır. Bu yalnızca görünüm
  tercihidir; kalıcı kişisel gizleme için `veri/gizlenen.json` kullanılır.
- Ana `Seçime Bağlı Ders I-IV` kapalıysa alt branş listesi disabled şekilde
  bırakılmamalı, tamamen gizlenmelidir.
- Açılır menü ders listesi kutusu tarafından kesilmemelidir. Bu yüzden filtre
  kutusunu içeren `.kutu` için `overflow: visible` korunur.
- Ders listesi kutusunun minimum yüksekliği olmalıdır; menü açılıp kapanınca
  alt bölüm sıkışmış gibi görünmemelidir.

## Aynı Gün Öneri Kutusu

- Mezuniyet gereksinimi satırları fareyle veya klavyeyle odaklandığında
  plandaki ders kodu/adı ve bu dönem açılma durumu ayrı bir ipucunda gösterilir.
  Resmî ders listesi olmayan seçime bağlı slotlarda yalnızca o dönemki plan
  dışı adaylar danışman onayı notuyla görünür; eksik kaynak olan gruplarda
  eksik liste tamamlanmış gibi gösterilmez. İpucu sayfa taşmasına göre konumlanır.
- Uzay Mühendisliği İngilizce için kaydedilmiş plan 2628 ve ders kodları
  UZM'dir. Uçak ve Uzay Mühendisliği / UUM ekran görüntülerindeki
  paketleri bu planın listesi diye birleştirme; farklı müfredat olabilir.

- Ders satırına gelince aynı gün, saat çakışması olmayan adaylar önerilir.
- Kutu `min(430px, 100vw - 32px)` genişliğindedir ve alt satır **sarmaz**
  (`flex-wrap: nowrap`): hoca adı üç nokta ile kısalır, eylem rozeti
  (`ekle` / `seçili - kaldır` / `seçiminle çakışır`) hep sağ uçta kalır.
  Sarmaya izin verince rozet kendi satırına düşüyor ve liste dağınık görünüyor.
  Eylem rozetleri kendi metinlerini taşıdığı için renkli nokta almaz.
- Önerilerde `KOM` kodlu dersler her zaman üstte sıralanmalıdır; diğerleri kod
  ve CRN'e göre sıralanabilir.
- Her öneride küçük paket etiketi de görünmelidir:
  `Zorunlu Matematik Dersi`, `Zorunlu Seçmeli Ders I-III`,
  `Seçime Bağlı Ders I-IV` gibi.
- Öneri kutusundaki `ekle`/`seçili - kaldır` davranışı açık kutuyu kapatmadan
  durumu tazelemelidir.

## Haftalık Program

- Program bloklarında ders kodu, ders adı ve öğretim üyesi görünür.
- Bloka tıklamak dersi aktif programdan çıkarır. Bu davranış tooltip ve hover
  stiliyle anlaşılır olmalıdır.
- Uzun ders adları blok içinde taşmamalı; iki satıra kadar kırpılarak
  gösterilmelidir.
- Blok ayrıntıları için tarayıcının `title` balonu **kullanılmaz**; o balon
  biçimlendirilemiyor ve panelin diliyle uyuşmuyor. Yerine tek bir `.blok-ipucu`
  kutusu üretilip yeniden kullanılır (cam yüzey, bloğun sağına/soluna
  yerleşir, pencereye sıkıştırılır). Bloklar `role="button"` + `tabindex="0"`
  olduğu için ipucu klavyeyle de (focus) açılır.
- Aynı gün saatleri çakışan dersler üst üste binip birbirini kapatmaz;
  `aralikSutunlariniHesapla` fonksiyonu ile alt sütunlara bölünerek yan yana
  (`.blok.yan-yana`) gösterilir. Hover edildiğinde `z-index: 5` ile öne çıkar.

## Görsel Tercihler

- Koyu temada varsayılan Windows scrollbar çok kalın ve beyaz görünür. Ortak
  `scrollbar-width` ve `::-webkit-scrollbar` stilleri korunmalıdır.
- Filtre menüsü ve tooltip'ler koyu tema ile uyumlu olmalı, metinler taşmamalı,
  yatay kaydırmalı filtre şeridi kullanılmamalıdır.
- 2026 tasarım yenilemesinin **düzeni korunur** (`58c2ab6`); renk katmanı iki kez
  değişti. İlk bordo/pembe palet beğenilmedi; ikinci nötr palet "soluk" bulundu.
  Yürürlükteki yön: **canlı renkler, camgöbeği arayüz vurgusu, cam yüzeyler** —
  referans bir borsa uygulamasının görünümü.
- Palet kuralı: **renk yalnızca veriye aittir.** Arayüz vurgusu `--vurgu`
  camgöbeğidir (koyu `#22d3ee`, açık `#0e7490`) ve kasıtlı olarak hiçbir kategori
  rengiyle aynı aileden değildir; en yakın kategoriden ΔE 15+ uzaktadır. Vurguyu
  bir kategori rengiyle aynı yapma — ilk palette mavi vurgu `Zorunlu Seçmeli
  Ders` mavisiyle çakışıyordu.
- Vurgu üstündeki metin `--vurgu-yazi` token'ıyla gelir; `#fff` sabiti yazma.
- Rozetler **nötr ink + renkli nokta** kalıbını kullanır (`--rozet-renk`). Rozet
  metnini kategori rengiyle boyama: renk aynı anda hem 4.5:1 metin kontrastı hem
  kategori ayrımı sağlayamıyor.
- Kategori renkleri `dataviz` skill'indeki `validate_palette.js` ile seçildi.
  Hue'lar sabit (kehribar 75°, zümrüt 160°, mavi 255°, mor 300°, pembe 350°),
  ayrım **parlaklık kaydırmasıyla** sağlanır. Tailwind benzeri "güzel" tonları
  olduğu gibi alma: `#60a5fa`/`#c084fc` çifti deuteranopide ΔE 1.3 idi.
  Yürürlükteki sonuç — koyu: CVD ΔE 9.1 / normal 17.1 (hepsi geçer);
  açık: CVD ΔE 7.7 (6–8 uyarı bandı) / normal 18.1.
- Koyu temada kategori renkleri parlaklık bandının (L 0.48–0.67) üstündedir.
  Bu **bilinçli**: depo sahibi canlı renk istedi, ayrım eşikleri zaten geçiyor.
  Bandı gerekçe göstererek tonları soluklaştırma.
- Seminer/tez/etik ve "bu dersi aldın" nötr (`--notr`) kullanır. Yeşil artık
  `Zorunlu Ders` kategorisinin rengi; durum yeşili yalnızca `.uyari.basari`.
  Eski `--indigo`/`--mor` çifti deuteranopide ΔE 1.0 idi, yani aynı renkti.
- Dönem etiketi (`#donemEtiketi`) kategori rengi almaz; nötr rozettir.
- Altıncı bir kromatik kategori **ekleme**; beş slot eşikleri ancak tutuyor.

## Buton ve Alan Dili

- Butonlar Apple'ın sistem butonlarına benzetilmiştir: **kapsül yarıçap
  (`999px`), kenarlık yok, parlama/gradyan yok.** Ayrım kenarlıktan değil
  dolgudan gelir: `--dugme-yuzey` / `--dugme-yuzey-2` (Apple'ın
  `rgba(120,120,128,a)` sistem fill grileri; koyu temada .24/.36, açıkta
  .12/.20). Butona kenarlık veya `linear-gradient` gloss ekleme.
- Basılı durum `transform: scale(.96)`. Hover yalnızca dolguyu koyulaştırır;
  eski "hover'da kenarlık vurgu rengine döner" davranışı kaldırıldı.
- `.dugme.sessiz` Apple'ın "plain" butonudur: dururken yalnız metin, hover'da
  dolgu. Hover kuralı `.dugme:hover`'dan **sonra** gelmeli, aksi hâlde
  transparan zemin eşit özgüllükle kazanır ve düğme hover geri bildirimi vermez.
- `.dugme.minik` ve tema düğmesi daire (`border-radius: 50%`).
- Metin alanları, `select`'ler ve gereksinim açılır düğmesi de aynı dili
  konuşur (dolgulu, kenarlıksız, kapsül). Onay/radyo kutuları seçiciden
  **hariç tutulur** (`input:not([type="checkbox"]):not([type="radio"])`),
  yoksa daireye dönüşürler.
- **Alanların dolgusu donuk olmalı** (`--alan-yuzey`, `color-mix` ile üretilir).
  `select`'e yarı saydam `rgba()` dolgu verme: tarayıcının yerel açılır listesi
  saydamlığı taşıyamıyor, beyaz zemine düşüyor ve seçenekler soluk/devre dışı
  görünüyor. `option { background: var(--kart); color: var(--yazi); }` de gerekli.
  Butonlar yarı saydam kalabilir, onlarda yerel açılır liste yok.
- `--vurgu-hover` token'dır. Hover tonunu `@media (prefers-color-scheme)`
  içine yazma — elle seçilen temada çalışmaz.

## Cam Yüzeyler ve Tema Anahtarı

- Cam efekti (`backdrop-filter: blur() saturate()` + üst parlama + yumuşak gölge)
  yalnızca **chrome** yüzeylerine uygulanır: başlık, açılır menüler, profil
  menüsü, ipucu, yan panel, giriş kutusu. Uzun metin listelerine uygulama —
  kaydırırken metin okunaksızlaşır ve performans düşer.
- `backdrop-filter` desteklenmeyen tarayıcıda `@supports not` bloğu düz
  `var(--kart)` zeminine döner; saydam yüzey yalnız başına bırakılmaz.
- Tema üç durumludur: `sistem` → `acik` → `koyu`. Kullanıcı seçimi kökteki
  `data-tema` ile taşınır ve `dsp_tema` localStorage anahtarında saklanır.
  CSS'te üç kapsam da tanımlı olmalı: `:root` (açık),
  `@media (prefers-color-scheme: dark) :root:not([data-tema="acik"])`,
  `:root[data-tema="koyu"]`. Bir rengi yalnız media bloğunda tanımlama.
- `index.html` içindeki küçük satır içi script tema tercihini **stil
  yüklenmeden** uygular; onu kaldırma, yoksa koyu temada beyaz çakma olur.
- Tema düğmesi hem başlıkta hem giriş ekranında vardır (`[data-tema-dugmesi]`);
  giriş ekranı oturum açılmadan göründüğü için ikisi de gerekir.

- Ders listesi minimum yüksekliği ve filtre menüsünün taşmadan açılması korunur.
  Haftalık programdaki saat çizgileri `app.js` tarafından çizilir; dekoratif
  sabit aralıklı CSS çizgileri eklenmemelidir.
- Görsel değişiklikler masaüstü ve dar ekranlarda, açık/koyu tema ve klavye
  odağıyla kontrol edilmelidir.

## Doğrulama

- JS değişikliklerinden sonra:

```bash
node --check web/app.js
```

- Python değişikliklerinden sonra:

```powershell
$env:PYTHONUTF8='1'; python -m py_compile server.py panel.py obs_client.py
```

- Panelin çalıştığını kontrol:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8730/api/veri'
```

- Sunucu eski kodu kullanıyorsa portu tutan `python panel.py` süreçlerini
  kapatıp tek temiz süreç başlat. Birden fazla eski panel süreci kalırsa API
  beklenen yeni alanları döndürmeyebilir.

## GitHub Pages ve Dağıtım

- Ürünün adı CRN Atlas'tır. Logo teslim edilene kadar girişte CA harflerinden
  oluşan geçici işaret ve favicon kullanılır. İTÜ logosu kullanılmaz; resmî
  uygulama olmadığı açıkça belirtilir.
- Pages proje yolu depo adından gelir: hedef adres
  https://muhal1.github.io/crn-atlas/ . Depo yeniden adlandırıldığında
  eski Pages yolu otomatik yönlenmez. Supabase Auth URL Configuration'da
  yeni adresi Site URL ve tam eşleşen Redirect URL olarak ayarla; geçişte
  eski Redirect URL'yi mevcut e-posta bağlantıları için koru.
- Panel çift modlu (dual-mode) çalışır:
  - Yerel sunucu varken (`/api/veri` erişilebilir) değişiklikler kişisel JSON dosyalarına yazılır.
  - Canlı statik ortamda ortak `plan.json`, `dersler.json`, `ayarlar.json` okunur;
    kişisel veriler Supabase Auth kullanıcısına ait `user_profiles` satırında tutulur.
- Giriş/kayıt akışı `web/auth.js`, güvenlik kuralları `supabase/schema.sql`, kurulum
  adımları `docs/ACCOUNT_SETUP.md` içindedir.
- Kişisel veriler otomatik olarak ilk giriş yapan hesaba taşınmaz. Profil
  menüsündeki JSON içe/dışa aktarma ile kullanıcı açıkça taşıma yapar.
- `veri/alinan.json`, `veri/secim.json`, `veri/gizlenen.json` yerelde kalır;
  Git tarafından izlenmez ve Pages dağıtımına eklenmez.
- Dağıtım `.github/workflows/deploy.yml` üzerinden GitHub Actions ile yapılır.
  Depo ayarlarından `Settings -> Pages -> Source: GitHub Actions` seçilmelidir.
- Otomatik zamanlanmış cron (sabah ve akşam) veya GitHub arayüzünden manuel tetikleme
  ile `python panel.py dersler` çalıştırılarak ÖBS kontenjanları güncellenir.
