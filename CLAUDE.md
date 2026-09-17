# Ders Seçim Paneli

Kurulum ve kullanım talimatı [`AGENTS.md`](AGENTS.md) dosyasındadır — bu projeyi
ilk kez kuruyorsan oradaki adımları izle (bölümü sor → `planId` bul → ayarları
yaz → veriyi çek → alınan dersleri sor → paneli aç).

Projenin ne olduğu, mimarisi ve tüm komutlar için [`README.md`](README.md).

Kısa notlar:

* Bağımlılık yok, sadece Python 3.9+ standart kütüphanesi. `pip install` gerekmez.
* Kişisel veri `veri/` klasöründedir ve paylaşım paketine dahil edilmez.
* Kod ve arayüz Türkçedir; değişken/fonksiyon adları da Türkçe tutulur.

## Commit kuralı

Bu projede commit mesajlarına `Co-Authored-By: Claude ...` satırı **ekleme**.
Commit'lerin tek yazarı depo sahibidir.

## Depo

Tek depo vardır: <https://github.com/muhal1/crn-atlas> (public).
Canlı sürüm: <https://muhal1.github.io/crn-atlas/>

Eskiden ayrı bir "paylaşım" ve bir "kişisel" depo tutuluyordu; ikisi
birleştirildi. İkinci bir depoya kopyalama diye bir adım **yok**.

Kişisel kullanıcı verisi (`veri/alinan.json`, `veri/secim.json`,
`veri/gizlenen.json`) `.gitignore`'dadır ve depoya girmez. `veri/` altındaki
diğer dosyalar ortak ders planı/dönem verisidir; panelin çalışması için gerekir
ve zaten GitHub Pages üzerinden herkese açıktır.

Süreç notları ve ajanlar arası devir kayıtları depo **dışındadır**: bir üst
klasördeki `notlar/` altında tutulur. Kodun davranışını etkileyen kararlar ise
depo içinde `docs/MAINTENANCE_NOTES.md` dosyasında kalır.
