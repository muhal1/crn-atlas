# Kullanıcı Hesapları Kurulumu

Canlı GitHub Pages sürümü, e-posta/şifre girişi ve kullanıcıya özel veriler için
Supabase kullanır. Ortak ders planı ve açılan dersler GitHub Pages'ten okunur;
alınan dersler, program profilleri, gizlenen dersler ve branş süzgeçleri yalnızca
ilgili kullanıcının Supabase satırında tutulur.

## 1. Supabase projesi

1. Supabase'te yeni bir proje oluştur.
2. **SQL Editor** bölümünde `supabase/schema.sql` dosyasını çalıştır.
3. **Authentication > URL Configuration** altında Site URL olarak GitHub Pages
   adresini yaz: `https://muhal1.github.io/crn-atlas/`
4. Aynı adresi Redirect URLs listesine de ekle.
5. **Authentication > Providers > Email** altında e-posta sağlayıcısını açık tut.
   E-posta doğrulaması açık kalabilir.

Tablodaki Row Level Security kuralları her kullanıcının yalnızca kendi satırını
okumasına ve değiştirmesine izin verir.

Akademik rehber için mevcut kurulumda `supabase/schema.sql` dosyasını yeniden
çalıştır; yeni `academic_profile` sütununu ve salt okunur `academics` kataloğunu
oluşturur. Ardından `supabase/academic_seed.sql` dosyasını SQL Editor'da çalıştır.
İki dosya tekrar çalıştırılabilir. Canlı veritabanına bunlar uygulanana kadar
Hocalar ekranı statik katalogdan açılır, ancak canlı hesaptaki akademik profil
kaydedilemez. Katalog sorgusunun `authenticated` rolüne açık olup olmadığını
ve RLS politikasını kontrol et; erişim ayrıca Data API ayarlarına bağlıdır.

## 2. GitHub değişkenleri

Supabase **Project Settings > API Keys** ekranındaki Project URL ve publishable
key değerlerini GitHub deposunda **Settings > Secrets and variables > Actions >
Variables** bölümüne ekle:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Publishable key tarayıcı uygulamalarında kullanılmak üzere tasarlanmıştır.
`service_role` anahtarı bu projeye veya GitHub değişkenlerine kesinlikle eklenmez.

## 3. İlk dağıtım ve kişisel profil

Değişiklikler `main` dalına gönderildiğinde GitHub Actions yeni `config.js`
dosyasını değişkenlerden üretir. Canlı sitede **Yeni kayıt** ile hesap aç.

Kendi mevcut bilgilerini taşımak için profil menüsündeki **Verilerimi içe aktar**
düğmesiyle bilgisayarındaki `veri/alinan.json`, `veri/secim.json` ve
`veri/gizlenen.json` dosyalarını birlikte seç. Bunlar yalnızca seçtiğin hesaba
yazılır. Başka bir tarayıcıdan aktarım için eski panelde **Verilerimi dışa aktar**
ile tek bir yedek indirip yeni panelde içe aktarabilirsin. Taşınanlar:

- alınan dersler,
- alternatif programlar ve CRN seçimleri,
- gizlenen dersler,
- kapatılan branş süzgeçleri.

Yerel `python panel.py` kullanımı hesap gerektirmez ve bilgisayardaki
`veri/alinan.json`, `veri/secim.json`, `veri/gizlenen.json` dosyalarıyla çalışır.
Bu üç dosya `.gitignore` içindedir ve canlı dağıtıma kopyalanmaz.
