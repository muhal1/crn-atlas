"use strict";

window.DSPCalendar = (() => {
  const $ = (secici) => document.querySelector(secici);
  let takvim = null;
  let gecmisAcik = false;
  const gunMs = 24 * 60 * 60 * 1000;
  const aylar = {
    ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
    temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
  };

  function oge(tur, sinif, metin) {
    const eleman = document.createElement(tur);
    if (sinif) eleman.className = sinif;
    if (metin != null) eleman.textContent = metin;
    return eleman;
  }

  function tarihParcasi(metin, varsayilanAy, varsayilanYil, bitis = false) {
    const eslesme = metin.match(/^\s*(\d{1,2})(?:\s+([\p{L}]+))?(?:\s+(\d{4}))?/u);
    if (!eslesme) return null;
    const gun = Number(eslesme[1]);
    const ay = eslesme[2] ? aylar[eslesme[2].toLocaleLowerCase("tr")] : varsayilanAy;
    const yil = eslesme[3] ? Number(eslesme[3]) : varsayilanYil;
    const saat = metin.match(/(?:\s|\-)(\d{1,2}):(\d{2})\s*$/);
    const saatDegeri = saat ? Number(saat[1]) : bitis ? 23 : 0;
    const dakika = saat ? Number(saat[2]) : bitis ? 59 : 0;
    if (ay == null || !yil || gun < 1 || saatDegeri > 23 || dakika > 59 ||
        new Date(Date.UTC(yil, ay, gun)).getUTCDate() !== gun) return null;
    const damga = Date.parse(`${yil}-${String(ay + 1).padStart(2, "0")}-${String(gun).padStart(2, "0")}T${String(saatDegeri).padStart(2, "0")}:${String(dakika).padStart(2, "0")}:${bitis ? "59.999" : "00.000"}+03:00`);
    return { gun, ay, yil, damga, gunSayisi: Date.UTC(yil, ay, gun) / gunMs, yilVar: Boolean(eslesme[3]) };
  }

  function tarihAraligi(metin) {
    const parcalar = metin.split(/\s+-\s+/);
    if (parcalar.length > 2) return null;
    const bitis = tarihParcasi(parcalar.at(-1), null, null, true);
    if (!bitis) return null;
    let baslangic = tarihParcasi(parcalar[0], bitis.ay, bitis.yil);
    if (!baslangic) return null;
    if (parcalar.length > 1 && !baslangic.yilVar && baslangic.ay > bitis.ay) {
      baslangic = tarihParcasi(parcalar[0], bitis.ay, bitis.yil - 1);
    }
    if (!baslangic || baslangic.damga > bitis.damga) return null;
    return { baslangic, bitis };
  }

  function bugunSayisi() {
    const parcali = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const degerler = Object.fromEntries(parcali.map((p) => [p.type, Number(p.value)]));
    return Date.UTC(degerler.year, degerler.month - 1, degerler.day) / gunMs;
  }

  function durumHesapla(metin, simdi, bugun) {
    const aralik = tarihAraligi(metin);
    if (!aralik) return { tur: "belirsiz", metin: "Gün bilgisi yok", sira: Infinity };
    if (simdi < aralik.baslangic.damga) {
      const gun = aralik.baslangic.gunSayisi - bugun;
      return { tur: "gelecek", metin: gun ? `${gun} gün var` : "Bugün başlıyor", sira: aralik.baslangic.damga };
    }
    if (simdi <= aralik.bitis.damga) {
      const gun = aralik.bitis.gunSayisi - bugun;
      return { tur: "aktif", metin: gun ? `${gun} gün kaldı` : "Bugün son gün", sira: aralik.baslangic.damga };
    }
    const gun = bugun - aralik.bitis.gunSayisi;
    return { tur: "gecmis", metin: gun ? `${gun} gün geçti` : "Bugün sona erdi", sira: aralik.bitis.damga };
  }

  function satirOlustur(etkinlik, donemAdi, gecmis = false) {
    const satir = oge("li", `takvim-satir takvim-durum-${etkinlik.durum.tur}`);
    const olay = oge("span", "takvim-olay", etkinlik.title);
    if (gecmis) olay.append(oge("small", "takvim-donem-etiketi", donemAdi));
    satir.append(oge("span", "takvim-tarih", etkinlik.date), olay,
      oge("span", "takvim-sayac", etkinlik.durum.metin));
    return satir;
  }

  function gecmisYigini(etkinlikler) {
    const bolum = oge("section", `takvim-gecmis${gecmisAcik ? " acik" : ""}`);
    const ust = oge("div", "takvim-gecmis-ust");
    const ozet = oge("div", "takvim-gecmis-ozet");
    ozet.append(oge("strong", "", "Geçmiş tarihler"),
      oge("span", "", `${etkinlikler.length} etkinlik yığında`));
    const dugme = oge("button", "takvim-gecmis-dugmesi");
    dugme.type = "button";
    dugme.setAttribute("aria-controls", "takvimGecmisIcerik");
    dugme.setAttribute("aria-expanded", String(gecmisAcik));
    const ok = oge("span", "takvim-gecmis-ok", "⌄");
    ok.setAttribute("aria-hidden", "true");
    dugme.append(oge("span", "", gecmisAcik ? "Geçmişi gizle" : "Geçmişi göster"), ok);
    ust.append(ozet, dugme, oge("span", "takvim-gecmis-bosluk"));
    const panel = oge("div", "takvim-gecmis-panel");
    panel.id = "takvimGecmisIcerik";
    panel.inert = !gecmisAcik;
    panel.setAttribute("aria-hidden", String(!gecmisAcik));
    const liste = oge("ol", "takvim-liste");
    etkinlikler.sort((a, b) => b.durum.sira - a.durum.sira).forEach((e) =>
      liste.append(satirOlustur(e, e.donemAdi, true)));
    panel.append(liste);
    dugme.addEventListener("click", () => {
      gecmisAcik = !gecmisAcik;
      bolum.classList.toggle("acik", gecmisAcik);
      dugme.setAttribute("aria-expanded", String(gecmisAcik));
      dugme.firstElementChild.textContent = gecmisAcik ? "Geçmişi gizle" : "Geçmişi göster";
      panel.inert = !gecmisAcik;
      panel.setAttribute("aria-hidden", String(!gecmisAcik));
    });
    bolum.append(ust, panel);
    return bolum;
  }

  function ciz() {
    if (!takvim) return;
    const arama = $("#takvimArama").value.trim().toLocaleLowerCase("tr");
    const secilenDonem = $("#takvimDonem").value;
    const icerik = $("#takvimIcerik");
    icerik.replaceChildren();
    const simdi = Date.now();
    const bugun = bugunSayisi();
    const gecmis = [];
    const donemler = [];
    let toplam = 0;

    for (const donem of takvim.periods) {
      if (secilenDonem && donem.name !== secilenDonem) continue;
      const etkinlikler = donem.events.filter(({ title, date }) =>
        `${title} ${date}`.toLocaleLowerCase("tr").includes(arama))
        .map((e) => ({ ...e, donemAdi: donem.name, durum: durumHesapla(e.date, simdi, bugun) }));
      if (!etkinlikler.length) continue;
      toplam += etkinlikler.length;
      gecmis.push(...etkinlikler.filter((e) => e.durum.tur === "gecmis"));
      const guncel = etkinlikler.filter((e) => e.durum.tur !== "gecmis")
        .sort((a, b) => a.durum.sira - b.durum.sira);
      if (!guncel.length) continue;

      const bolum = oge("section", "takvim-donem");
      const baslik = oge("div", "takvim-donem-baslik");
      baslik.append(oge("h2", "", donem.name), oge("span", "takvim-sayi", `${guncel.length} güncel tarih`));
      bolum.append(baslik);
      const liste = oge("ol", "takvim-liste");
      for (const etkinlik of guncel) liste.append(satirOlustur(etkinlik, donem.name));
      bolum.append(liste);
      donemler.push(bolum);
    }
    if (gecmis.length) icerik.append(gecmisYigini(gecmis));
    icerik.append(...donemler);
    $("#takvimDurum").textContent = toplam ? `${toplam} etkinlik gösteriliyor.` : "Bu aramaya uyan tarih bulunamadı.";
  }

  async function init() {
    $("#takvimArama").addEventListener("input", ciz);
    $("#takvimDonem").addEventListener("change", ciz);
    try {
      const yanit = await fetch("veri/akademik_takvim.json", { cache: "no-store" });
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
      const veri = await yanit.json();
      if (!/^20\d{2}-20\d{2}$/.test(veri.academic_year) || !Array.isArray(veri.periods) ||
          veri.periods.length !== 2 || veri.periods.some((d) => !Array.isArray(d.events))) {
        throw new Error("Takvim verisi geçersiz.");
      }
      takvim = veri;
      $("#takvimYil").textContent = `${veri.academic_year.replace("-", "–")} Eğitim – Öğretim Yılı`;
      $("#takvimKaynak").href = veri.source_url;
      const guncelleme = new Date(veri.updated_at);
      $("#takvimGuncelleme").textContent = Number.isNaN(guncelleme.getTime())
        ? "İTÜ resmî takviminden alınmıştır."
        : `Veri güncellemesi: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(guncelleme)}`;
      $("#takvimDonem").append(...veri.periods.map((d) => new Option(d.name, d.name)));
      ciz();
    } catch (hata) {
      $("#takvimGuncelleme").textContent = "Tarihler yüklenemedi.";
      $("#takvimDurum").textContent = `Takvim yüklenemedi (${hata.message}). Resmî takvimi bağlantıdan açabilirsin.`;
    }
  }

  return { init };
})();
