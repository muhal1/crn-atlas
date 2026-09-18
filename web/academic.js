"use strict";

// Akademik katalog ile ders programı birbirinden bağımsız tutulur.
window.DSPAcademic = (() => {
  const $ = (s) => document.querySelector(s);
  const kaynakYolu = "veri/akademisyenler.json";
  const profilAnahtari = () => `dsp_akademik_profil:${window.DSPAuth.kullaniciId() || "yerel"}`;
  let hocalar = [];
  let secilenAlanlar = [];
  let kayitZamanlayici = 0;
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
    if (bolum !== "hocalar") detayiKapat();
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

  const bolumHocalari = (bolum = profil.bolum) => hocalar.filter((h) => h.bolum === bolum);
  const alanListesi = (bolum = profil.bolum) => [...new Set(bolumHocalari(bolum).flatMap((h) => h.alanlar))].sort((a, b) => a.localeCompare(b, "tr"));
  function alanSeciciyiDoldur() {
    const secici = $("#hocaAlan");
    const onceki = secici.value;
    secici.replaceChildren(new Option("Tüm çalışma alanları", ""), ...alanListesi().map((a) => new Option(a, a)));
    if (alanListesi().includes(onceki)) secici.value = onceki;
  }
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
    const metin = `${ogeler.length} öğretim üyesi gösteriliyor · ${bolumHocalari().length} katalog kaydı`;
    $("#hocaDurum").textContent = katalogUyarisi ? `${metin}. ${katalogUyarisi}` : metin;
  }

  const bolumListesi = () => (typeof durum !== "undefined" && durum.bolumler?.length
    ? durum.bolumler : [{ id: "kontrol", ad: "Kontrol ve Otomasyon Mühendisliği" }]);
  const bolumAdi = (id) => bolumListesi().find((b) => b.id === id)?.ad || "—";

  function detayBolumu(baslik, ogeler) {
    if (!ogeler || !ogeler.length) return null;
    const blok = el("div", "hoca-detay-blok");
    blok.append(el("p", "soluk hoca-detay-blok-baslik", baslik));
    const liste = el("ul", "hoca-detay-liste");
    ogeler.forEach((oge) => liste.append(el("li", null, oge)));
    blok.append(liste);
    return blok;
  }

  function detayiKapat() {
    const alan = $("#hocaDetay");
    if (alan.open) alan.close();
    else alan.replaceChildren();
  }

  // Eslestirmeyi besleyen ilgi alanlari burada gorunur, duzenleme profile gider.
  function ilgiBandiniCiz() {
    const cipler = $("#hocaIlgiCipleri"); cipler.replaceChildren();
    $("#hocaIlgiBolum").textContent = bolumAdi(profil.bolum);
    $("#hocaAltBaslik").textContent = `${bolumAdi(profil.bolum)} öğretim üyelerini ve doğrulanmış çalışma alanlarını keşfet.`;
    const varMi = profil.alanlar.length > 0;
    $("#hocaIlgiBaslik").textContent = varMi ? "İlgi alanların" : "Henüz ilgi alanı seçmedin";
    $("#hocaIlgiDuzenle").textContent = varMi ? "Profilimi düzenle →" : "İlgi alanı ekle →";
    if (varMi) for (const alan of profil.alanlar) cipler.append(el("span", "hoca-etiket eslesme", alan));
    else cipler.append(el("span", "soluk", "Profiline alan ekleyince eşleşen hocalar listede öne çıkar."));

    $("#hocaIlgiKapsam").classList.add("gizli");

    // Alan yokken "ilgi alanlarima uyanlar" suzgeci hicbir sey dondurmez.
    const kutu = $("#hocaEslesen");
    if (!varMi && kutu.checked) kutu.checked = false;
    kutu.disabled = !varMi;
    kutu.closest("label").classList.toggle("pasif", !varMi);
    kutu.closest("label").title = varMi ? "" : "Önce profilinden ilgi alanı ekle.";
  }

  function hocalariCiz(detayId) {
    ilgiBandiniCiz();
    const detay = hocalar.find((h) => h.id === detayId);
    const alan = $("#hocaDetay");
    if (!detay) detayiKapat();
    else {
      alan.replaceChildren();
      const kutu = el("article", "hoca-detay");
      const kapat = el("button", "hoca-detay-kapat", "✕");
      kapat.type = "button"; kapat.setAttribute("aria-label", "Kapat");
      kapat.addEventListener("click", () => alan.close());
      kutu.append(kapat, el("h2", null, detay.ad), el("p", "soluk", `${detay.unvan} · ${bolumAdi(detay.bolum)}`), etiketler(detay));
      if (detay.aciklama) kutu.append(el("p", null, detay.aciklama));
      const ortak = ortakAlanlar(detay);
      kutu.append(el("p", null, ortak.length ? `Seçtiğin ${profil.alanlar.length} ilgi alanından ${ortak.length} tanesi örtüşüyor: ${ortak.join(", ")}.` : "İlgi alanlarınla doğrulanmış bir ortak alan henüz bulunmadı."));
      [
        detayBolumu("İkincil çalışma alanları", detay.ikincilAlanlar),
        detayBolumu("Uygulama alanları", detay.uygulamaAlanlari),
        detayBolumu("Son dönem araştırma yönleri", detay.sonDonemYonleri),
        detayBolumu("Potansiyel tez yönleri", detay.potansiyelTezKonulari),
      ].forEach((blok) => { if (blok) kutu.append(blok); });
      if (detay.teknolojiler) kutu.append(el("p", "soluk", `İlişkili teknolojiler: ${detay.teknolojiler}`));
      const baglar = el("div", "hoca-detay-kaynak");
      const kaynak = el("a", null, "İTÜ personel kaynağı ↗"); kaynak.href = detay.kaynak; kaynak.target = "_blank"; kaynak.rel = "noopener noreferrer";
      baglar.append(kaynak);
      if (detay.alanKaynagi && detay.alanKaynagi !== detay.kaynak) {
        const alanKaynagi = el("a", null, "Çalışma alanı kaynağı ↗"); alanKaynagi.href = detay.alanKaynagi; alanKaynagi.target = "_blank"; alanKaynagi.rel = "noopener noreferrer";
        baglar.append(alanKaynagi);
      }
      kutu.append(el("p", "soluk", `Kaynak kontrolü: ${detay.dogrulamaTarihi}. Çalışma alanı uyumu, tez öğrencisi kabul ettiği anlamına gelmez.`), baglar);
      alan.append(kutu);
      if (!alan.open) alan.showModal();
    }
    const sorgu = $("#hocaArama").value.toLocaleLowerCase("tr").trim();
    const seciliAlan = $("#hocaAlan").value;
    const eslesen = $("#hocaEslesen").checked;
    const kayitli = $("#hocaKayitli").checked;
    const sonuc = bolumHocalari().filter((h) =>
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
    secilenAlanlar = alanListesi().filter((a) => profil.alanlar.includes(a));
    alanlariCiz();
    ozetiCiz();
    kaydetDurumu();
  }

  // Secilenler her zaman gorunur; secilmemisler "Alan ekle" altinda durur ve
  // kaydettikten sonra o bolum kapanir.
  function alanlariCiz() {
    const secili = $("#profilSecilenAlanlar"); secili.replaceChildren();
    if (!secilenAlanlar.length) {
      secili.append(el("p", "soluk", "Henüz alan seçmedin — aşağıdan ekleyebilirsin."));
    } else {
      for (const alan of secilenAlanlar) {
        const dugme = el("button", "hoca-etiket eslesme profil-alan-cip");
        dugme.type = "button";
        dugme.setAttribute("aria-label", `${alan} alanını kaldır`);
        dugme.append(document.createTextNode(alan), el("span", "profil-alan-cip-ikon", "✕"));
        dugme.addEventListener("click", () => {
          secilenAlanlar = secilenAlanlar.filter((a) => a !== alan);
          alanlariCiz(); ozetiCiz(); kaydetDurumu();
        });
        secili.append(dugme);
      }
    }

    const sorgu = $("#alanArama").value.toLocaleLowerCase("tr").trim();
    const kalan = alanListesi().filter((a) => !secilenAlanlar.includes(a));
    const gosterilen = sorgu ? kalan.filter((a) => a.toLocaleLowerCase("tr").includes(sorgu)) : kalan;
    const kutu = $("#profilAlanSecenekleri"); kutu.replaceChildren();
    if (!alanListesi().length) kutu.append(el("p", "soluk", "Henüz doğrulanmış çalışma alanı bulunamadı."));
    else if (!gosterilen.length) kutu.append(el("p", "soluk", kalan.length ? "Bu aramayla alan bulunamadı." : "Tüm alanları seçtin."));
    else for (const alan of gosterilen) {
      const dugme = el("button", "hoca-etiket profil-alan-cip");
      dugme.type = "button";
      dugme.setAttribute("aria-label", `${alan} alanını ekle`);
      dugme.append(el("span", "profil-alan-cip-ikon", "+"), document.createTextNode(alan));
      dugme.addEventListener("click", () => {
        secilenAlanlar = [...secilenAlanlar, alan].sort((a, b) => a.localeCompare(b, "tr"));
        alanlariCiz(); ozetiCiz(); kaydetDurumu();
      });
      kutu.append(dugme);
    }
  }

  function ozetiCiz() {
    const ad = ($("#akademikProfilFormu").elements.ad.value || "").trim() || window.DSPAuth.varsayilanAd();
    $("#profilOzetAd").textContent = ad;
    $("#profilOzetHarf").textContent = ad.charAt(0).toLocaleUpperCase("tr") || "P";
    $("#profilOzetEposta").textContent = window.DSPAuth.eposta() || "Bu bilgisayardaki yerel profil";
    $("#profilSayiAlan").textContent = secilenAlanlar.length;
    $("#profilSayiEslesen").textContent = bolumHocalari().filter((h) => h.alanlar.some((a) => secilenAlanlar.includes(a))).length;
    $("#profilSayiKayitli").textContent = profil.kaydedilenler.length;
  }

  function formVerisi() {
    const g = new FormData($("#akademikProfilFormu"));
    return {
      ad: String(g.get("ad") || "").trim().slice(0, 100), bolum: g.get("bolum"),
      duzey: g.get("duzey"), hedef: g.get("hedef"),
      alanlar: [...secilenAlanlar], kaydedilenler: profil.kaydedilenler,
    };
  }

  function degisiklikVar() {
    const y = formVerisi();
    return ["ad", "bolum", "duzey", "hedef"].some((k) => (y[k] || "") !== (profil[k] || "")) ||
      y.alanlar.length !== profil.alanlar.length ||
      y.alanlar.some((a) => !profil.alanlar.includes(a));
  }

  function kaydetDurumu() {
    const dugme = $("#profilKaydet");
    const kirli = degisiklikVar();
    dugme.disabled = !kirli;
    dugme.textContent = kirli ? "Profili kaydet" : "Kaydedildi";
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
          id: h.id, ad: h.name, unvan: h.title, bolum: h.department,
          aciklama: h.description, alanlar: h.topics,
          ikincilAlanlar: h.secondary_topics, uygulamaAlanlari: h.application_areas,
          teknolojiler: h.technologies, sonDonemYonleri: h.recent_directions,
          potansiyelTezKonulari: h.thesis_directions,
          kaynak: h.source_url, alanKaynagi: h.topic_source_url, dogrulamaTarihi: h.verified_on,
        }));
        else katalogUyarisi = "Veritabanı kataloğu henüz yüklenmedi; site kataloğu gösteriliyor.";
      } catch {
        katalogUyarisi = "Veritabanı kataloğu okunamadı; site kataloğu gösteriliyor.";
      }
    }
    alanSeciciyiDoldur();
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
    const hocaDetay = $("#hocaDetay");
    // Pencere kapaninca (Esc, x veya arka plan) adres listeye geri doner.
    hocaDetay.addEventListener("close", () => {
      hocaDetay.replaceChildren();
      if (window.location.hash.startsWith("#hocalar/")) window.location.hash = "#hocalar";
    });
    hocaDetay.addEventListener("click", (olay) => { if (olay.target === hocaDetay) hocaDetay.close(); });
    window.addEventListener("resize", menuErisimi);
    document.addEventListener("keydown", (olay) => {
      if (olay.key === "Escape" && $("#atlasKabuk").classList.contains("menu-mobil-acik")) { mobilKapat(); $("#mobilMenuAc").focus(); }
    });
    window.addEventListener("hashchange", gez);
    for (const s of ["#hocaArama", "#hocaAlan", "#hocaEslesen", "#hocaKayitli"]) {
      $(s).addEventListener(s === "#hocaArama" ? "input" : "change", () => hocalariCiz(sayfa()[1]));
    }
    const profilFormu = $("#akademikProfilFormu");
    profilFormu.addEventListener("input", (olay) => {
      if (olay.target.id === "alanArama") { alanlariCiz(); return; }
      ozetiCiz(); kaydetDurumu();
    });
    profilFormu.addEventListener("change", () => { ozetiCiz(); kaydetDurumu(); });
    profilFormu.addEventListener("submit", async (olay) => {
      olay.preventDefault();
      const yeni = formVerisi();
      yeni.alanlar = yeni.alanlar.filter((a) => alanListesi(yeni.bolum).includes(a));
      secilenAlanlar = [...yeni.alanlar];
      const mesaj = $("#profilKayitDurum");
      const dugme = $("#profilKaydet");
      clearTimeout(kayitZamanlayici);
      mesaj.className = "profil-kayit-durum";
      mesaj.textContent = "Kaydediliyor…";
      dugme.disabled = true;
      try {
        if (typeof bolumDegistir === "function" && yeni.bolum !== durum.aktifBolum) {
          await bolumDegistir(yeni.bolum);
        }
        await profiliSakla(yeni);
        profil = yeni; window.DSPAuth.gorunenAdiAyarla(yeni.ad);
        alanSeciciyiDoldur();
        mesaj.className = "profil-kayit-durum tamam";
        mesaj.textContent = "✓ Kaydedildi";
        $("#alanEkle").open = false;
        $("#alanArama").value = "";
        alanlariCiz(); ozetiCiz();
        hocalariCiz(sayfa()[1]);
        kayitZamanlayici = setTimeout(() => { mesaj.textContent = ""; mesaj.className = "profil-kayit-durum"; }, 4000);
      } catch (hata) {
        mesaj.className = "profil-kayit-durum hata";
        mesaj.textContent = `Kaydedilemedi: ${hata.message}`;
      }
      finally { kaydetDurumu(); }
    });
    menuErisimi();
    gez();
  }

  async function init() {
    bagla();
    $("#akademikBolum").replaceChildren(...bolumListesi().map((b) => new Option(b.ad, b.id)));
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
      // Ders verisi hangi bölüme göre yüklendiyse profil de onu gösterir.
      if (typeof durum !== "undefined" && durum.aktifBolum) profil.bolum = durum.aktifBolum;
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
