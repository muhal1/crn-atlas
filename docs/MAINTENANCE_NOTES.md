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
- Aynı gün saatleri çakışan dersler üst üste binip birbirini kapatmaz;
  `aralikSutunlariniHesapla` fonksiyonu ile alt sütunlara bölünerek yan yana
  (`.blok.yan-yana`) gösterilir. Hover edildiğinde `z-index: 5` ile öne çıkar.

## Görsel Tercihler

- Koyu temada varsayılan Windows scrollbar çok kalın ve beyaz görünür. Ortak
  `scrollbar-width` ve `::-webkit-scrollbar` stilleri korunmalıdır.
- Filtre menüsü ve tooltip'ler koyu tema ile uyumlu olmalı, metinler taşmamalı,
  yatay kaydırmalı filtre şeridi kullanılmamalıdır.
- 2026 tasarım yenilemesinin **düzeni korunur** (`58c2ab6`: ortalanmış giriş
  ekranı, 6px köşe, düz yüzeyler). Yalnızca **renk katmanı** değiştirildi; bordo/
  pembe vurgulu ilk palet beğenilmedi ve atıldı.
- Palet kuralı: **renk yalnızca veriye aittir.** Arayüz vurgusu (`--vurgu`)
  kasıtlı olarak renksizdir (açık temada koyu arduvaz, koyu temada kırık beyaz),
  çünkü gereksinim türleri + durum renkleri renk çarkını zaten doldurur. Vurgu
  rengini bir gereksinim rengiyle aynı aileden seçme — eski palette `--vurgu`
  mavisi `Zorunlu Seçmeli Ders` mavisiyle çakışıyordu.
- Vurgu üstündeki metin `--vurgu-yazi` token'ıyla yönetilir; `#fff` sabiti yazma
  (koyu temada açık vurgu üstüne beyaz yazı okunmuyordu).
- Rozetler **nötr ink + renkli nokta** kalıbını kullanır (`--rozet-renk`).
  Rozet metnini kategori rengiyle boyama: renk hem 4.5:1 metin kontrastı hem
  kategori ayrımı sağlamak zorunda kalınca ikisi birden tutmuyor.
- Gereksinim renkleri `dataviz` skill'indeki `validate_palette.js` ile
  doğrulandı. Ekranda gerçekten görünen dört kategori (kehribar `--turuncu`,
  deniz yeşili `--turkuaz`, mavi `--mavi`, mor `--mor`) her iki temada da tüm
  çiftlerde geçer: en kötü çift açık temada ΔE 12.2 (CVD) / 16.7 (normal),
  koyu temada ΔE 11.5 / 16.6.
- `--pembe` (sosyal/İTB) beşinci slottur ve tüm-çift CVD eşiğini geçmez
  (koyu temada `--turkuaz` ile ΔE ~4). Kabul edilebilir çünkü rozet her zaman
  kendi metnini taşır; renk tek başına anlam taşımaz. Altıncı bir kromatik
  kategori **ekleme** - geçmez.
- Seminer/tez/etik artık kategori rengi değil nötr (`--notr`) kullanır. Eski
  `--indigo` ile `--mor` çifti deuteranopide ΔE 1.0 idi, yani pratikte aynı
  renkti. `GEREKSINIM_RENK_PALETI` bu yüzden beş kromatik slot tutar.
- Dönem etiketi (`#donemEtiketi`) kategori rengi almaz; nötr rozettir.
- Palet değiştirirken doğrula:

```bash
node <skill>/scripts/validate_palette.js "#8a6200,#00897a,#3a6fd8,#7a2490" --mode light --surface "#ffffff" --pairs all
node <skill>/scripts/validate_palette.js "#bd8a22,#2aa694,#6b90ee,#8f4fbb" --mode dark --surface "#171a1f" --pairs all
```

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
