"use strict";

// Akademik katalog ile ders programı birbirinden bağımsız tutulur.
window.DSPAcademic = (() => {
  const $ = (s) => document.querySelector(s);
  const kaynakYolu = "veri/akademisyenler.json";
  const profilAnahtari = () => `dsp_akademik_profil:${window.DSPAuth.kullaniciId() || "yerel"}`;
  let hocalar = [];
  let profil = { ad: "", bolum: "kontrol", duzey: "", hedef: "", alanlar: [], kaydedilenler: [] };
  let katalogUyarisi = "";

  function sayfa() {
    const parcalar = decodeURIComponent(location.hash.slice(1)).split("/");
    return ["hocalar", "takvim", "profilim"].includes(parcalar[0]) ? parcalar : ["dersler"];
  }

  function mobilKapat() {
    $("#atlasKabuk").classList.remove("menu-mobil-acik");
    $("#mobilMenuPerdesi").classList.add("gizli");
    $("#mobilMenuAc").setAttribute("aria-expanded", "false");
    menuErisimi();
  }

  function menuErisimi() {
    $("#atlasMenu").inert = matchMedia("(max-width: 800px)").matches &&
      !$("#atlasKabuk").classList.contains("menu-mobil-acik");
  }

  function gez() {
    const [bolum, hocaId] = sayfa();
    $("#dersSayfasi").classList.toggle("gizli", bolum !== "dersler");
    $(".ust").classList.toggle("gizli", bolum !== "dersler");
    $("#hocalarSayfasi").classList.toggle("gizli", bolum !== "hocalar");
    $("#takvimSayfasi").classList.toggle("gizli", bolum !== "takvim");
    $("#profilSayfasi").classList.toggle("gizli", bolum !== "profilim");
    $("#atlasMenu").querySelectorAll("[data-sayfa]").forEach((bag) => {
      if (bag.dataset.sayfa === bolum) bag.setAttribute("aria-current", "page");
      else bag.removeAttribute("aria-current");
    });
    $("#profilMenu").classList.add("gizli");
    $("#hesapMenuDugmesi").setAttribute("aria-expanded", "false");
    mobilKapat();
    if (bolum === "hocalar") hocalariCiz(hocaId);
    document.title = `${{ dersler: "Ders Seçimi", hocalar: "Hocalar", takvim: "Akademik Takvim", profilim: "Profilim" }[bolum]} | CRN Atlas`;
  }

  const alanListesi = () => [...new Set(hocalar.flatMap((h) => h.alanlar))].sort((a, b) => a.localeCompare(b, "tr"));
  const ortakAlanlar = (h) => h.alanlar.filter((alan) => profil.alanlar.includes(alan));
  const el = (tag, cls, metin) => {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (metin != null) d.textContent = metin;
    return d;
  };

  function etiketler(hoca) {
    const kutu = el("div", "hoca-etiketler");
    hoca.alanlar.forEach((alan) => kutu.append(el("span", `hoca-etiket${profil.alanlar.includes(alan) ? " eslesme" : ""}`, alan)));
    if (!hoca.alanlar.length) kutu.append(el("span", "soluk", "Çalışma alanı henüz doğrulanmadı"));
    return kutu;
  }

  function durumMetni(ogeler) {
    const metin = `${ogeler.length} öğretim üyesi gösteriliyor · ${hocalar.length} katalog kaydı`;
    $("#hocaDurum").textContent = katalogUyarisi ? `${metin}. ${katalogUyarisi}` : metin;
  }

  function hocalariCiz(detayId) {
    const detay = hocalar.find((h) => h.id === detayId);
    const alan = $("#hocaDetay");
    alan.replaceChildren();
    alan.classList.toggle("gizli", !detay);
    if (detay) {
      const kutu = el("article", "hoca-detay");
      const geri = el("a", null, "← Hoca listesine dön"); geri.href = "#hocalar";
      kutu.append(geri, el("h2", null, detay.ad), el("p", "soluk", `${detay.unvan} · Kontrol ve Otomasyon Mühendisliği`), etiketler(detay));
      const ortak = ortakAlanlar(detay);
      kutu.append(el("p", null, ortak.length ? `Seçtiğin ${profil.alanlar.length} ilgi alanından ${ortak.length} tanesi örtüşüyor: ${ortak.join(", ")}.` : "İlgi alanlarınla doğrulanmış bir ortak alan henüz bulunmadı."));
      const baglar = el("div", "hoca-detay-kaynak");
      const kaynak = el("a", null, "İTÜ personel kaynağı ↗"); kaynak.href = detay.kaynak; kaynak.target = "_blank"; kaynak.rel = "noopener noreferrer";
      baglar.append(kaynak);
      if (detay.alanKaynagi && detay.alanKaynagi !== detay.kaynak) {
        const alanKaynagi = el("a", null, "Çalışma alanı kaynağı ↗"); alanKaynagi.href = detay.alanKaynagi; alanKaynagi.target = "_blank"; alanKaynagi.rel = "noopener noreferrer";
        baglar.append(alanKaynagi);
      }
      kutu.append(el("p", "soluk", `Kaynak kontrolü: ${detay.dogrulamaTarihi}. Çalışma alanı uyumu, tez öğrencisi kabul ettiği anlamına gelmez.`), baglar);
      alan.append(kutu);
    }
    const sorgu = $("#hocaArama").value.toLocaleLowerCase("tr").trim();
    const seciliAlan = $("#hocaAlan").value;
    const eslesen = $("#hocaEslesen").checked;
    const kayitli = $("#hocaKayitli").checked;
    const sonuc = hocalar.filter((h) =>
      (!sorgu || `${h.ad} ${h.alanlar.join(" ")}`.toLocaleLowerCase("tr").includes(sorgu)) &&
      (!seciliAlan || h.alanlar.includes(seciliAlan)) &&
      (!eslesen || ortakAlanlar(h).length) &&
      (!kayitli || profil.kaydedilenler.includes(h.id))
    ).sort((a, b) => ortakAlanlar(b).length - ortakAlanlar(a).length || a.ad.localeCompare(b.ad, "tr"));
    durumMetni(sonuc);
    const liste = $("#hocaKartlari"); liste.replaceChildren();
    if (!sonuc.length) {
      liste.append(el("p", "soluk", "Bu süzgeçlerle hoca bulunamadı. Aramayı veya filtreleri değiştirebilirsin."));
      return;
    }
    for (const h of sonuc) {
      const kart = el("article", "hoca-karti");
      const baslik = el("h2", null, h.ad);
      kart.append(baslik, el("p", "soluk", h.unvan), etiketler(h));
      if (ortakAlanlar(h).length) kart.append(el("p", null, `${ortakAlanlar(h).length} ortak ilgi alanı`));
      const alt = el("div", "hoca-karti-alt");
      const link = el("a", null, "Profili gör →"); link.href = `#hocalar/${encodeURIComponent(h.id)}`;
      const dugme = el("button", "dugme kucuk", profil.kaydedilenler.includes(h.id) ? "Kaydedildi" : "Kaydet");
      dugme.type = "button";
      dugme.setAttribute("aria-label", `${h.ad}: ${dugme.textContent}`);
      dugme.addEventListener("click", async () => {
        const onceki = [...profil.kaydedilenler];
        profil.kaydedilenler = onceki.includes(h.id) ? onceki.filter((x) => x !== h.id) : [...onceki, h.id];
        try { await profiliSakla(profil); hocalariCiz(sayfa()[1]); }
        catch (hata) { profil.kaydedilenler = onceki; katalogUyarisi = `Kaydedilemedi: ${hata.message}`; hocalariCiz(sayfa()[1]); }
      });
      alt.append(link, dugme); kart.append(alt); liste.append(kart);
    }
  }

  function formuDoldur() {
    const form = $("#akademikProfilFormu");
    for (const ad of ["ad", "bolum", "duzey", "hedef"]) {
      form.elements[ad].value = profil[ad] || (ad === "ad" ? window.DSPAuth.varsayilanAd() : ad === "bolum" ? "kontrol" : "");
    }
    const alanlar = $("#profilAlanSecenekleri"); alanlar.replaceChildren();
    for (const alan of alanListesi()) {
      const label = el("label"); const input = el("input");
      input.type = "checkbox"; input.name = "alanlar"; input.value = alan; input.checked = profil.alanlar.includes(alan);
      label.append(input, document.createTextNode(alan)); alanlar.append(label);
    }
    if (!alanListesi().length) alanlar.append(el("p", "soluk", "Henüz doğrulanmış çalışma alanı bulunamadı."));
  }

  async function profiliSakla(yeni) {
    if (window.DSPAuth.uzakProfil()) await window.DSPAuth.akademikProfilKaydet(yeni);
    else localStorage.setItem(profilAnahtari(), JSON.stringify(yeni));
  }

  async function katalogYukle() {
    const yanit = await fetch(kaynakYolu);
    if (!yanit.ok) throw new Error("Hoca kataloğu yüklenemedi.");
    const dosya = await yanit.json();
    hocalar = dosya;
    if (window.DSPAuth.uzakProfil()) {
      try {
        const veri = await window.DSPAuth.akademisyenleriYukle();
        if (veri?.length) hocalar = veri.map((h) => ({
          id: h.id, ad: h.name, unvan: h.title, bolum: h.department, alanlar: h.topics,
          kaynak: h.source_url, alanKaynagi: h.topic_source_url, dogrulamaTarihi: h.verified_on,
        }));
        else katalogUyarisi = "Veritabanı kataloğu henüz yüklenmedi; site kataloğu gösteriliyor.";
      } catch {
        katalogUyarisi = "Veritabanı kataloğu okunamadı; site kataloğu gösteriliyor.";
      }
    }
    const secici = $("#hocaAlan");
    secici.replaceChildren(new Option("Tüm çalışma alanları", ""), ...alanListesi().map((a) => new Option(a, a)));
  }

  function bagla() {
    let dar = false;
    try { dar = localStorage.getItem("dsp_menu_dar") === "1"; } catch {}
    $("#atlasKabuk").classList.toggle("menu-dar", dar);
    const daralt = $("#menuDaralt");
    function dugmeyiGuncelle() {
      const kapali = $("#atlasKabuk").classList.contains("menu-dar");
      daralt.setAttribute("aria-expanded", String(!kapali));
      daralt.setAttribute("aria-label", kapali ? "Menüyü genişlet" : "Menüyü daralt");
      daralt.title = daralt.getAttribute("aria-label");
    }
    dugmeyiGuncelle();
    daralt.addEventListener("click", () => {
      if (matchMedia("(max-width: 800px)").matches) { mobilKapat(); $("#mobilMenuAc").focus(); return; }
      const kapali = $("#atlasKabuk").classList.toggle("menu-dar");
      try { localStorage.setItem("dsp_menu_dar", kapali ? "1" : "0"); } catch {}
      dugmeyiGuncelle();
    });
    $("#mobilMenuAc").addEventListener("click", () => {
      $("#atlasKabuk").classList.add("menu-mobil-acik");
      $("#mobilMenuPerdesi").classList.remove("gizli");
      $("#mobilMenuAc").setAttribute("aria-expanded", "true");
      menuErisimi();
      $("#menuDaralt").focus();
    });
    $("#mobilMenuPerdesi").addEventListener("click", mobilKapat);
    window.addEventListener("resize", menuErisimi);
    document.addEventListener("keydown", (olay) => {
      if (olay.key === "Escape" && $("#atlasKabuk").classList.contains("menu-mobil-acik")) { mobilKapat(); $("#mobilMenuAc").focus(); }
    });
    window.addEventListener("hashchange", gez);
    for (const s of ["#hocaArama", "#hocaAlan", "#hocaEslesen", "#hocaKayitli"]) {
      $(s).addEventListener(s === "#hocaArama" ? "input" : "change", () => hocalariCiz(sayfa()[1]));
    }
    $("#akademikProfilFormu").addEventListener("submit", async (olay) => {
      olay.preventDefault();
      const form = olay.currentTarget;
      const g = new FormData(form);
      const yeni = {
        ad: String(g.get("ad") || "").trim().slice(0, 100), bolum: g.get("bolum"),
        duzey: g.get("duzey"), hedef: g.get("hedef"),
        alanlar: g.getAll("alanlar").filter((a) => alanListesi().includes(a)),
        kaydedilenler: profil.kaydedilenler,
      };
      const mesaj = $("#profilKayitDurum");
      mesaj.textContent = "Kaydediliyor…";
      form.querySelector('button[type="submit"]').disabled = true;
      try {
        await profiliSakla(yeni);
        profil = yeni; window.DSPAuth.gorunenAdiAyarla(yeni.ad);
        mesaj.textContent = "Profil kaydedildi.";
        hocalariCiz(sayfa()[1]);
      } catch (hata) { mesaj.textContent = `Kaydedilemedi: ${hata.message}`; }
      finally { form.querySelector('button[type="submit"]').disabled = false; }
    });
    menuErisimi();
    gez();
  }

  async function init() {
    bagla();
    const bolumSecici = $("#akademikBolum");
    bolumSecici.replaceChildren(...(typeof durum !== "undefined" && durum.bolumler?.length
      ? durum.bolumler : [{ id: "kontrol", ad: "Kontrol ve Otomasyon Mühendisliği" }]).map((b) => new Option(b.ad, b.id)));
    try {
      await katalogYukle();
    } catch (hata) {
      katalogUyarisi = hata.message;
    }
    try {
      const yuklenen = window.DSPAuth.uzakProfil()
        ? await window.DSPAuth.akademikProfilYukle()
        : JSON.parse(localStorage.getItem(profilAnahtari()) || "{}");
      if (yuklenen && typeof yuklenen === "object") {
        profil = {
          ...profil, ...yuklenen,
          alanlar: Array.isArray(yuklenen.alanlar) ? yuklenen.alanlar : [],
          kaydedilenler: Array.isArray(yuklenen.kaydedilenler) ? yuklenen.kaydedilenler : [],
        };
        delete profil.aciklama; // Eski profil yedeklerindeki kaldırılmış alanı taşımayalım.
        if (profil.ad) window.DSPAuth.gorunenAdiAyarla(profil.ad);
      }
    } catch (hata) {
      $("#profilKayitDurum").textContent = `Profil yüklenemedi: ${hata.message}`;
    }
    formuDoldur();
    hocalariCiz(sayfa()[1]);
  }
  async function aktarimYukle(veri) {
    if (!veri || typeof veri !== "object" || Array.isArray(veri) ||
        !Array.isArray(veri.alanlar) || !Array.isArray(veri.kaydedilenler)) {
      throw new Error("Akademik profil yedeği geçersiz.");
    }
    const temiz = {
      ad: String(veri.ad || "").slice(0, 100),
      bolum: String(veri.bolum || "kontrol"),
      duzey: String(veri.duzey || ""), hedef: String(veri.hedef || ""),
      alanlar: veri.alanlar.filter((a) => alanListesi().includes(a)),
      kaydedilenler: veri.kaydedilenler.filter((id) => hocalar.some((h) => h.id === id)),
    };
    await profiliSakla(temiz);
    profil = temiz;
    window.DSPAuth.gorunenAdiAyarla(profil.ad);
    formuDoldur(); hocalariCiz(sayfa()[1]);
  }
  return { init, aktarimVerisi: () => structuredClone(profil), aktarimYukle };
})();
