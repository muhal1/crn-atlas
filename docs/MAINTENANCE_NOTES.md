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
