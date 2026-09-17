/* Ders Seçim Paneli — arayüz mantığı.
   Veri sunucudan tek seferde gelir (/api/veri), değişiklikler /api/... ile geri yazılır. */

"use strict";

const durum = {
  ayarlar: {},
  plan: null,
  dersler: null,
  alinan: [],
  gizlenen: [],
  // Birden çok alternatif ders programı: {aktif, profiller:[{ad, crnler}]}
  secim: { aktif: "Program 1", profiller: [{ ad: "Program 1", crnler: [] }] },
  aktifBolum: "kontrol",
  bolumler: [],
  bolumVerileri: {},
};

const HAFTA = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const KISA = { Pazartesi: "Pzt", Salı: "Sal", Çarşamba: "Çar", Perşembe: "Per", Cuma: "Cum", Cumartesi: "Cmt", Pazar: "Paz" };
const BRANS_SUZGECI_KEY = "dersSecimPanel.secimeBagliKapaliBranslar";
let secimeBagliKapaliBranslar = new Set();

const $ = (secici) => document.querySelector(secici);
const el = (etiket, sinif, metin) => {
  const dugum = document.createElement(etiket);
  if (sinif) dugum.className = sinif;
  if (metin != null) dugum.textContent = metin;
  return dugum;
};

/* --------------------------------------------------------------- yardımcı */

const dakika = (saat) => {
  const [s, d] = String(saat || "").split(":").map(Number);
  return Number.isFinite(s) ? s * 60 + (d || 0) : null;
};

const araliklar = (ders) =>
  (ders.slotlar || [])
    .map((s) => ({ gun: s.gun, bas: dakika(s.baslangic), bit: dakika(s.bitis), derslik: s.derslik }))
    .filter((a) => a.bas != null && a.bit != null && a.bit > a.bas);

const cakisirMi = (a, b) =>
  araliklar(a).some((x) => araliklar(b).some((y) => x.gun === y.gun && x.bas < y.bit && y.bas < x.bit));

const dersBul = (crn) => (durum.dersler?.dersler || []).find((d) => d.crn === crn);
const alindiMi = (kod) => durum.alinan.some((d) => d.kod === kod);
const gizliMi = (kod) => durum.gizlenen.includes(kod);
const bransKodu = (kod) => String(kod || "").split(/\s+/)[0] || "";
const anaBransOnce = (ders) => ((durum.ayarlar?.anaBransKodlari || ["KOM"]).includes(bransKodu(ders.kod)) ? 0 : 1);

const ROMA_DEGER = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMA_YAZI = Object.fromEntries(Object.entries(ROMA_DEGER).map(([roma, sayi]) => [sayi, roma]));

const gereksinimGrubu = (ad) =>
  String(ad || "")
    .replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i, "")
    .trim();

const gereksinimSira = (ad) => {
  const eslesme = String(ad || "").trim().match(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i);
  return eslesme ? ROMA_DEGER[eslesme[1].toUpperCase()] : null;
};

function gereksinimGrupEtiketi(kok) {
  const gereksinimler = durum.plan?.gereksinimler || [];
  const siralar = gereksinimler
    .filter((g) => gereksinimGrubu(g.ad) === kok)
    .map((g) => gereksinimSira(g.ad))
    .filter((sira) => sira != null)
    .sort((a, b) => a - b);

  if (!siralar.length) return kok;
  const tekil = [...new Set(siralar)];
  if (tekil.length === 1) return `${kok} ${ROMA_YAZI[tekil[0]]}`;
  return `${kok} ${ROMA_YAZI[tekil[0]]}-${ROMA_YAZI[tekil[tekil.length - 1]]}`;
}

function dersFiltreAnahtarlari(ders) {
  if (!ders.plandaVar) return [serbestGereksinimAnahtari()];
  return [...new Set((ders.gereksinimler || []).map(gereksinimGrubu).filter(Boolean))];
}

function seciliGereksinimAnahtarlari() {
  return new Set(
    [...document.querySelectorAll('#gereksinimSuzgeci .suzgec-grup-input:checked')].map((girdi) => girdi.value)
  );
}

function bransSuzgeciYukle() {
  try {
    if (typeof localStorage === "undefined") return;
    secimeBagliKapaliBranslar = new Set(JSON.parse(localStorage.getItem(BRANS_SUZGECI_KEY) || "[]"));
  } catch {
    secimeBagliKapaliBranslar = new Set();
  }
}

function bransSuzgeciKaydet() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(BRANS_SUZGECI_KEY, JSON.stringify([...secimeBagliKapaliBranslar]));
  } catch {
    // Saklama kapalıysa filtre yine mevcut oturumda çalışır.
  }
  if (durum.statikMod && window.DSPAuth?.uzakProfil()) {
    window.DSPAuth.profilKaydet(profilVerisi()).catch((hata) => console.error("Branş süzgeci kaydedilemedi:", hata));
  }
}

function secimeBagliBranslar() {
  const branslar = new Map();
  for (const ders of durum.dersler?.dersler || []) {
    if (gizliMi(ders.kod)) continue;
    const brans = bransKodu(ders.kod);
    if (!brans) continue;
    const bilgi = branslar.get(brans) || { brans, adet: 0 };
    bilgi.adet += 1;
    branslar.set(brans, bilgi);
  }
  return [...branslar.values()].sort((a, b) => a.brans.localeCompare(b.brans, "tr"));
}

const dersRozetAdlari = (ders) =>
  [...new Set((ders.gereksinimler || []).map(gereksinimGrubu).filter(Boolean))].map(gereksinimGrupEtiketi);

const serbestGereksinimAnahtari = () => {
  const serbest = (durum.plan?.gereksinimler || []).find((g) => g.serbest);
  return serbest ? gereksinimGrubu(serbest.ad) : "__serbest__";
};

const serbestGereksinimEtiketi = () => {
  const serbest = (durum.plan?.gereksinimler || []).find((g) => g.serbest);
  return serbest ? gereksinimGrupEtiketi(gereksinimGrubu(serbest.ad)) : "Seçime Bağlı Ders";
};

const GEREKSINIM_RENK_PALETI = ["turuncu", "mavi", "mor", "turkuaz", "indigo", "pembe"];

/** Gereksinim/paket adına göre belirgin ve ayırt edici rozet renk sınıfı döndürür. */
function gereksinimRozetRengi(ad) {
  const metin = String(ad || "").toLocaleLowerCase("tr");
  if (metin.includes("matematik")) return "turuncu";
  if (metin.includes("zorunlu seçmeli")) return "mavi";
  if (metin.includes("seçime bağlı") || metin.includes("serbest")) return "mor";
  if (metin.includes("seminer") || metin.includes("tez") || metin.includes("etik")) return "indigo";
  if (metin.includes("sosyal") || metin.includes("itb") || metin.includes("insan ve toplum")) return "pembe";
  if (metin.includes("zorunlu")) return "turkuaz";
  if (metin.includes("seçmeli")) return "mavi";

  let hash = 0;
  for (let i = 0; i < metin.length; i++) {
    hash = (hash * 31 + metin.charCodeAt(i)) >>> 0;
  }
  return GEREKSINIM_RENK_PALETI[hash % GEREKSINIM_RENK_PALETI.length];
}

function guncelleGereksinimSuzgeciOzeti() {
  const suzgec = $("#gereksinimSuzgeci");
  const dugme = suzgec?.querySelector(".suzgec-ac");
  if (!dugme) return;

  const kutular = [...suzgec.querySelectorAll(".suzgec-grup-input")];
  const secili = kutular.filter((girdi) => girdi.checked);
  let metin = "Gereksinim seç";
  if (secili.length === kutular.length) metin = "Tüm gereksinimler";
  else if (secili.length === 1) metin = secili[0].closest("label")?.textContent.trim() || metin;
  else if (secili.length > 1) metin = `${secili.length} gereksinim seçili`;

  dugme.querySelector(".suzgec-ac-metin").textContent = metin;
}

/* --------------------------------------------------------- program profilleri */

const aktifProfil = () =>
  durum.secim.profiller.find((p) => p.ad === durum.secim.aktif) || durum.secim.profiller[0];

const aktifCrnler = () => aktifProfil()?.crnler || [];
const seciliDersler = () => aktifCrnler().map(dersBul).filter(Boolean);

/** Çakışan/boş adları düzelterek benzersiz bir profil adı üretir. */
function benzersizAd(istenen) {
  const adlar = durum.secim.profiller.map((p) => p.ad);
  let ad = (istenen || "").trim() || "Program";
  let sayac = 2;
  while (adlar.includes(ad)) ad = `${istenen.trim()} ${sayac++}`;
  return ad;
}

function profilEkle(crnler = []) {
  const ad = benzersizAd(`Program ${durum.secim.profiller.length + 1}`);
  durum.secim.profiller.push({ ad, crnler: [...crnler] });
  durum.secim.aktif = ad;
  return ad;
}

function kisiselVeriDisariAktar() {
  const icerik = JSON.stringify({
    alinan: durum.alinan,
    secim: { ...durum.secim, aktifBolum: durum.aktifBolum, bolumler: tumBolumVerileri() },
    gizlenen: durum.gizlenen,
    kapaliBranslar: [...secimeBagliKapaliBranslar],
  }, null, 2);
  const adres = URL.createObjectURL(new Blob([icerik], { type: "application/json" }));
  const baglanti = document.createElement("a");
  baglanti.href = adres;
  baglanti.download = "ders-secim-profilim.json";
  baglanti.click();
  setTimeout(() => URL.revokeObjectURL(adres), 1000);
}

async function kisiselVeriIceriAktar(dosyalar) {
  const okunan = {};
  for (const dosya of dosyalar) {
    const icerik = JSON.parse(await dosya.text());
    const ad = dosya.name.toLowerCase();
    if (ad === "alinan.json") okunan.alinan = normalDizi(icerik, "alinan");
    else if (ad === "secim.json") okunan.secim = icerik;
    else if (ad === "gizlenen.json") okunan.gizlenen = normalDizi(icerik, "kodlar");
    else if (icerik && typeof icerik === "object" && Array.isArray(icerik.alinan) &&
             Array.isArray(icerik.gizlenen) && icerik.secim) Object.assign(okunan, icerik);
    else throw new Error(`Tanınmayan dosya: ${dosya.name}`);
  }
  if (okunan.alinan && !Array.isArray(okunan.alinan)) throw new Error("Alınan ders verisi geçersiz.");
  if (okunan.gizlenen && !Array.isArray(okunan.gizlenen)) throw new Error("Gizlenen ders verisi geçersiz.");
  if (okunan.secim && (!Array.isArray(okunan.secim.profiller) || !okunan.secim.profiller.length)) {
    throw new Error("Program profili verisi geçersiz.");
  }
  if (!Object.keys(okunan).length) throw new Error("İçe aktarılacak veri bulunamadı.");
  if (!confirm("Seçilen dosyalar bu profildeki mevcut verilerin üzerine yazılsın mı?")) return;
  const yuklenenBolumler = okunan.secim?.bolumler;
  const yuklenenBolum = okunan.secim?.aktifBolum;
  if (yuklenenBolumler && yuklenenBolum && durum.bolumler.some((bolum) => bolum.id === yuklenenBolum)) {
    const yeniDersler = await bolumDersleriniYukle(yuklenenBolum);
    durum.bolumVerileri = yuklenenBolumler;
    durum.aktifBolum = yuklenenBolum;
    Object.assign(durum, yeniDersler);
    bolumVerisiniUygula(yuklenenBolumler[yuklenenBolum]);
  }
  Object.assign(durum, {
    alinan: okunan.alinan ?? durum.alinan,
    secim: yuklenenBolumler ? durum.secim : okunan.secim ?? durum.secim,
    gizlenen: okunan.gizlenen ?? durum.gizlenen,
  });
  if (Array.isArray(okunan.kapaliBranslar)) secimeBagliKapaliBranslar = new Set(okunan.kapaliBranslar);
  storageJsonKaydet(STORAGE_ALINAN_KEY, durum.alinan);
  storageJsonKaydet(STORAGE_SECIM_KEY, durum.secim);
  storageJsonKaydet(STORAGE_GIZLENEN_KEY, durum.gizlenen);
  if (!durum.statikMod) {
    storageJsonKaydet(STORAGE_BOLUMLER_KEY, { aktifBolum: durum.aktifBolum, bolumler: tumBolumVerileri() });
  }
  if (durum.statikMod && window.DSPAuth.uzakProfil()) {
    await window.DSPAuth.profilKaydet(profilVerisi());
  }
  cizSecenekler();
  ciz();
  bilgiGoster("Profil verileri içe aktarıldı.", "basari");
}

const saatMetni = (ders) => {
  const liste = araliklar(ders);
  if (!liste.length) return "Program belirtilmemiş";
  return liste
    .map((a) => `${KISA[a.gun] || a.gun} ${String(Math.floor(a.bas / 60)).padStart(2, "0")}:${String(a.bas % 60).padStart(2, "0")}–${String(Math.floor(a.bit / 60)).padStart(2, "0")}:${String(a.bit % 60).padStart(2, "0")}`)
    .join("  ·  ");
};

/* ------------------------------------------------------- plan ilerlemesi */

/** Alınan dersleri plan gereksinimlerine açgözlü biçimde eşler.
 *  Önce listesi belli (kısıtlı) gereksinimler doldurulur, artanlar serbest
 *  seçmeli slotlarına yerleşir. */
function planIlerlemesi(alinanKodlari) {
  const havuz = [...alinanKodlari];
  const satirlar = (durum.plan?.gereksinimler || []).map((g) => ({ gereksinim: g, dolduran: null }));

  for (const satir of satirlar) {
    if (satir.gereksinim.serbest) continue;
    const kodlar = satir.gereksinim.dersler.map((d) => d.kod);
    const sira = havuz.findIndex((k) => kodlar.includes(k));
    if (sira >= 0) satir.dolduran = havuz.splice(sira, 1)[0];
  }
  for (const satir of satirlar) {
    if (satir.gereksinim.serbest && !satir.dolduran && havuz.length) satir.dolduran = havuz.shift();
  }
  return { satirlar, artan: havuz };
}

/* ------------------------------------------------------------- sunucu ile */

const STORAGE_ALINAN_KEY = "dsp_alinan";
const STORAGE_SECIM_KEY = "dsp_secim";
const STORAGE_GIZLENEN_KEY = "dsp_gizlenen";
const STORAGE_SURUM_KEY = "dsp_surum";
const STORAGE_BOLUMLER_KEY = "dsp_bolumler";
const GUNCEL_SURUM = "2";

const storageAnahtari = (anahtar) => {
  const kullaniciId = window.DSPAuth?.kullaniciId();
  return kullaniciId && kullaniciId !== "yerel" ? `${anahtar}:${kullaniciId}` : anahtar;
};

const profilVerisi = () => ({
  alinan: durum.alinan,
  secim: { ...durum.secim, aktifBolum: durum.aktifBolum, bolumler: tumBolumVerileri() },
  gizlenen: durum.gizlenen,
  kapaliBranslar: [...secimeBagliKapaliBranslar],
});

const bosBolumVerisi = () => ({
  alinan: [], gizlenen: [], kapaliBranslar: [],
  secim: { aktif: "Program 1", profiller: [{ ad: "Program 1", crnler: [] }] },
});

function tumBolumVerileri() {
  return {
    ...durum.bolumVerileri,
    [durum.aktifBolum]: {
      alinan: durum.alinan,
      secim: durum.secim,
      gizlenen: durum.gizlenen,
      kapaliBranslar: [...secimeBagliKapaliBranslar],
    },
  };
}

function bolumVerisiniUygula(veri) {
  const temiz = veri || bosBolumVerisi();
  durum.alinan = normalDizi(temiz.alinan, "alinan");
  durum.gizlenen = normalDizi(temiz.gizlenen, "kodlar");
  durum.secim = temiz.secim?.profiller?.length ? temiz.secim : bosBolumVerisi().secim;
  secimeBagliKapaliBranslar = new Set(temiz.kapaliBranslar || []);
}

async function bolumDersleriniYukle(id) {
  const kok = id === "kontrol" ? "veri" : `veri/programlar/${id}`;
  const yanitlar = await Promise.all(["ayarlar", "plan", "dersler"].map((ad) => fetch(`${kok}/${ad}.json`)));
  if (yanitlar.some((yanit) => !yanit.ok)) throw new Error("Bölümün ders verileri yüklenemedi.");
  const [ayarlar, plan, dersler] = await Promise.all(yanitlar.map((yanit) => yanit.json()));
  if (!plan?.gereksinimler?.length || !Array.isArray(dersler?.dersler)) {
    throw new Error("Bölümün ders verileri eksik.");
  }
  return { ayarlar, plan, dersler };
}

async function bolumDegistir(id) {
  if (id === durum.aktifBolum) return;
  if (!durum.bolumler.some((bolum) => bolum.id === id)) return;
  const yeniDersler = await bolumDersleriniYukle(id);
  const oncekiId = durum.aktifBolum;
  durum.bolumVerileri = tumBolumVerileri();
  durum.aktifBolum = id;
  Object.assign(durum, yeniDersler);
  bolumVerisiniUygula(durum.bolumVerileri[id]);
  try {
    if (durum.statikMod && window.DSPAuth?.uzakProfil()) {
      await window.DSPAuth.profilKaydet(profilVerisi());
    } else {
      storageJsonKaydet(STORAGE_BOLUMLER_KEY, { aktifBolum: id, bolumler: tumBolumVerileri() });
    }
  } catch (hata) {
    durum.aktifBolum = oncekiId;
    Object.assign(durum, await bolumDersleriniYukle(oncekiId));
    bolumVerisiniUygula(durum.bolumVerileri[oncekiId]);
    throw hata;
  }
  $("#gereksinimSuzgeci").replaceChildren();
  cizSecenekler();
  ciz();
}

function normalDizi(veri, alan) {
  if (Array.isArray(veri)) return veri;
  if (veri && typeof veri === "object" && Array.isArray(veri[alan])) return veri[alan];
  return [];
}

function depolamaGocEt() {
  try {
    if (typeof localStorage === "undefined") return;
    const surum = localStorage.getItem(STORAGE_SURUM_KEY);
    if (surum !== GUNCEL_SURUM) {
      // Önceki sürümde statik modda yanlışlıkla boş dizi yazılan verileri temizle
      const yerelGizlenen = storageJsonYukle(STORAGE_GIZLENEN_KEY, null);
      if (Array.isArray(yerelGizlenen) && yerelGizlenen.length === 0) {
        localStorage.removeItem(STORAGE_GIZLENEN_KEY);
      }
      const yerelAlinan = storageJsonYukle(STORAGE_ALINAN_KEY, null);
      if (Array.isArray(yerelAlinan) && yerelAlinan.length === 0) {
        localStorage.removeItem(STORAGE_ALINAN_KEY);
      }
      localStorage.setItem(STORAGE_SURUM_KEY, GUNCEL_SURUM);
    }
  } catch {
    // Depolama kapalıysa devam et
  }
}

function storageJsonYukle(anahtar, varsayilan) {
  try {
    if (typeof localStorage === "undefined") return varsayilan;
    const ham = localStorage.getItem(storageAnahtari(anahtar));
    return ham ? JSON.parse(ham) : varsayilan;
  } catch {
    return varsayilan;
  }
}

function storageJsonKaydet(anahtar, deger) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(storageAnahtari(anahtar), JSON.stringify(deger));
  } catch {
    // Saklama kapalıysa hata vermeden devam et
  }
}

async function veriYukle() {
  depolamaGocEt();
  const bolumYaniti = await fetch("veri/programlar.json").catch(() => null);
  durum.bolumler = bolumYaniti?.ok ? await bolumYaniti.json() : [{ id: "kontrol", ad: "Kontrol ve Otomasyon Mühendisliği Yüksek Lisans" }];
  let veri = null;
  durum.statikMod = false;

  try {
    const yanit = await fetch("/api/veri");
    if (yanit.ok) {
      veri = await yanit.json();
    }
  } catch {
    veri = null;
  }

  // Sunucu yanıt vermediyse (GitHub Pages / statik barındırma)
  if (!veri) {
    durum.statikMod = true;
    const yerelProfil = !window.DSPAuth?.uzakProfil();
    const yerelAlinan = yerelProfil ? storageJsonYukle(STORAGE_ALINAN_KEY, null) : null;
    const yerelSecim = yerelProfil ? storageJsonYukle(STORAGE_SECIM_KEY, null) : null;
    const yerelGizlenen = yerelProfil ? storageJsonYukle(STORAGE_GIZLENEN_KEY, null) : null;
    let uzakProfil = null;
    if (!yerelProfil) uzakProfil = await window.DSPAuth.profilYukle();
    const yerelBolumler = yerelProfil ? storageJsonYukle(STORAGE_BOLUMLER_KEY, null) : null;
    const kayitliBolumler = uzakProfil?.secim?.bolumler || yerelBolumler?.bolumler;
    const aktifBolum = uzakProfil?.secim?.aktifBolum || yerelBolumler?.aktifBolum || "kontrol";
    durum.aktifBolum = durum.bolumler.some((bolum) => bolum.id === aktifBolum) ? aktifBolum : "kontrol";
    durum.bolumVerileri = kayitliBolumler || {
      kontrol: {
        alinan: uzakProfil?.alinan ?? yerelAlinan ?? [],
        secim: uzakProfil?.secim ?? yerelSecim ?? bosBolumVerisi().secim,
        gizlenen: uzakProfil?.gizlenen ?? yerelGizlenen ?? [],
        kapaliBranslar: uzakProfil?.kapali_branslar ?? [],
      },
    };
    const { ayarlar, plan, dersler } = await bolumDersleriniYukle(durum.aktifBolum);

    const bosSecim = { aktif: "Program 1", profiller: [{ ad: "Program 1", crnler: [] }] };

    veri = {
      ayarlar,
      plan,
      dersler,
      alinan: durum.bolumVerileri[durum.aktifBolum]?.alinan ?? [],
      secim: durum.bolumVerileri[durum.aktifBolum]?.secim ?? bosSecim,
      gizlenen: durum.bolumVerileri[durum.aktifBolum]?.gizlenen ?? [],
      kapaliBranslar: durum.bolumVerileri[durum.aktifBolum]?.kapaliBranslar ?? [],
      eskiProfilVar: Boolean(uzakProfil),
    };
  }

  Object.assign(durum, veri);
  if (!durum.statikMod) {
    const yerelBolumler = storageJsonYukle(STORAGE_BOLUMLER_KEY, null);
    durum.aktifBolum = yerelBolumler?.aktifBolum || "kontrol";
    durum.bolumVerileri = yerelBolumler?.bolumler || {};
    if (durum.aktifBolum !== "kontrol") {
      Object.assign(durum, await bolumDersleriniYukle(durum.aktifBolum));
      bolumVerisiniUygula(durum.bolumVerileri[durum.aktifBolum]);
      veri = { ...veri, secim: durum.secim, alinan: durum.alinan, gizlenen: durum.gizlenen, kapaliBranslar: [...secimeBagliKapaliBranslar] };
    }
  }
  durum.alinan = normalDizi(veri.alinan, "alinan");
  durum.gizlenen = normalDizi(veri.gizlenen, "kodlar");
  if (Array.isArray(veri.kapaliBranslar)) {
    secimeBagliKapaliBranslar = new Set(veri.kapaliBranslar);
  } else {
    bransSuzgeciYukle();
  }

  const gelen = veri.secim;
  if (gelen && Array.isArray(gelen.profiller) && gelen.profiller.length) {
    durum.secim = gelen;
  } else {
    // Eski biçim (düz CRN listesi) ya da boş dosya
    durum.secim = {
      aktif: "Program 1",
      profiller: [{ ad: "Program 1", crnler: Array.isArray(gelen) ? gelen : [] }],
    };
  }

  storageJsonKaydet(STORAGE_ALINAN_KEY, durum.alinan);
  storageJsonKaydet(STORAGE_SECIM_KEY, durum.secim);
  storageJsonKaydet(STORAGE_GIZLENEN_KEY, durum.gizlenen);
  if (!durum.statikMod && durum.aktifBolum === "kontrol") {
    durum.bolumVerileri.kontrol = {
      alinan: durum.alinan, secim: durum.secim, gizlenen: durum.gizlenen,
      kapaliBranslar: [...secimeBagliKapaliBranslar],
    };
  }
  if (durum.statikMod && window.DSPAuth?.uzakProfil() && !veri.eskiProfilVar) {
    try {
      await window.DSPAuth.profilKaydet(profilVerisi());
    } catch (hata) {
      console.error("Profil ilk kez kaydedilemedi:", hata);
    }
  }
}

async function kaydet(yol, govde, storageKey, storageVal) {
  if (storageKey) {
    storageJsonKaydet(storageKey, storageVal);
  }
  if (!durum.statikMod && durum.aktifBolum !== "kontrol") {
    storageJsonKaydet(STORAGE_BOLUMLER_KEY, { aktifBolum: durum.aktifBolum, bolumler: tumBolumVerileri() });
  } else if (!durum.statikMod) {
    try {
      await fetch(yol, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });
    } catch (hata) {
      console.error("Kaydetme hatası:", hata);
    }
  } else if (window.DSPAuth?.uzakProfil()) {
    try {
      await window.DSPAuth.profilKaydet(profilVerisi());
    } catch (hata) {
      bilgiGoster("Profil değişiklikleri kaydedilemedi. İnternet bağlantını kontrol et.", "hata");
    }
  }
}

const alinanKaydet = () => kaydet("/api/alinan", { alinan: durum.alinan }, STORAGE_ALINAN_KEY, durum.alinan);
const secimKaydet = () => kaydet("/api/secim", durum.secim, STORAGE_SECIM_KEY, durum.secim);
const gizlenenKaydet = () => kaydet("/api/gizlenen", { kodlar: durum.gizlenen }, STORAGE_GIZLENEN_KEY, durum.gizlenen);

/* ------------------------------------------------------------- çizim: üst */

function cizUst() {
  const bolumSecici = $("#bolumSecici");
  bolumSecici.replaceChildren(...durum.bolumler.map((bolum) => {
    const secenek = el("option", null, bolum.ad);
    secenek.value = bolum.id;
    return secenek;
  }));
  bolumSecici.value = durum.aktifBolum;
  const eksikSayisi = durum.plan?.gereksinimler?.filter((g) => g.eksikKaynak).length || 0;
  const kaynakUyarisi = $("#kaynakUyarisi");
  if (eksikSayisi) {
    kaynakUyarisi.textContent = `İTÜ ÖBS ${eksikSayisi} ders grubunun listesini şu anda vermiyor. Özellikle zorunlu seçmeli dersleri danışmanınla doğrulamadan kesinleşmiş sayma. `;
    const kaynak = el("a", null, "Resmî ders planı");
    kaynak.href = `https://obs.itu.edu.tr/public/DersPlan/DersPlanDetay/${Number(durum.plan.planId)}`;
    kaynak.target = "_blank";
    kaynak.rel = "noopener noreferrer";
    kaynakUyarisi.append(kaynak);
    kaynakUyarisi.classList.remove("gizli");
  } else {
    kaynakUyarisi.classList.add("gizli");
  }
  $("#bolumAdi").textContent = durum.ayarlar.bolum || durum.plan?.planAdi || "Ders Seçim Paneli";
  $("#donemEtiketi").textContent = durum.dersler?.donem || "Dönem verisi yok";
  $("#donemEtiketi").className = "rozet " + (durum.dersler ? "mavi" : "");
  $("#veriTarihi").textContent = durum.dersler?.cekilme ? `veri: ${durum.dersler.cekilme}` : "";
  $("#alinanSayi").textContent = durum.alinan.length;

  const uyari = $("#uyari");
  if (!durum.plan || !durum.dersler) {
    uyari.innerHTML =
      "Veri henüz çekilmemiş. Terminalde proje klasöründe <code>python panel.py guncelle</code> " +
      "çalıştır, sonra bu sayfayı yenile.";
    uyari.classList.remove("gizli");
  } else {
    uyari.classList.add("gizli");
  }
}

/** Bir ders kodunun adını bulur: önce alınan kayıtlar, sonra plan, sonra
 *  bu dönem açılan dersler. Bulunamazsa boş döner. */
function dersAdi(kod) {
  const alinanKayit = durum.alinan.find((d) => d.kod === kod);
  if (alinanKayit?.ad) return alinanKayit.ad;

  const plandaki = (durum.plan?.gereksinimler || [])
    .flatMap((g) => g.dersler)
    .find((d) => d.kod === kod);
  if (plandaki?.ad) return plandaki.ad;

  return (durum.dersler?.dersler || []).find((d) => d.kod === kod)?.ad || "";
}

/** Gereksinim satırının sağındaki "KOM 513E · Modelling & Kontrol Of Robots" metni. */
function dolduranEtiketi(kod, ek = "") {
  const kutu = el("span", "dolduran-ders");
  kutu.append(el("span", "dolduran-kod", kod));
  const ad = dersAdi(kod);
  if (ad) kutu.append(el("span", "dolduran-ad", ad));
  if (ek) kutu.append(el("span", "dolduran-ek", ek));
  return kutu;
}

/* ----------------------------------------------------- çizim: gereksinimler */

function cizGereksinimler() {
  const kap = $("#gereksinimListesi");
  kap.replaceChildren();
  if (!durum.plan) {
    kap.append(el("div", "bos", "Ders planı yok."));
    return;
  }

  const ilerleme = planIlerlemesi(durum.alinan.map((d) => d.kod));
  const secililer = seciliDersler();
  const kullanilanSecim = new Set();
  let tamamlanan = 0;

  for (const satir of ilerleme.satirlar) {
    const g = satir.gereksinim;
    const kutu = el("div", "gereksinim");
    let durumMetni = "";
    let durumDugumu = null;

    if (satir.dolduran) {
      tamamlanan++;
      kutu.classList.add("tamam");
      kutu.append(el("span", "isaret", "✓"));
      durumDugumu = dolduranEtiketi(satir.dolduran);
    } else {
      // Bu dönem seçilen dersler bu slotu doldurabilir mi?
      const aday = secililer.find(
        (d) =>
          !kullanilanSecim.has(d.crn) &&
          (g.serbest || g.dersler.some((pd) => pd.kod === d.kod))
      );
      if (aday) {
        kullanilanSecim.add(aday.crn);
        kutu.classList.add("secili");
        kutu.append(el("span", "isaret", "◍"));
        durumDugumu = dolduranEtiketi(aday.kod, "(seçildi)");
      } else {
        kutu.append(el("span", "isaret", "○"));
        durumMetni = g.serbest ? `${serbestGereksinimEtiketi()} adayı` : g.eksikKaynak ? "Liste alınamadı" : `${g.dersler.length} seçenek`;
      }
    }

    const orta = el("div", "ad");
    const adSatiri = el("div", "gereksinim-ad-satiri");
    adSatiri.append(el("span", null, g.ad));
    // Lisans planlarında aynı ad birden çok yarıyılda geçer; ayırt edilsin
    if (g.yariyil) adSatiri.append(el("span", "yariyil", g.yariyil));
    orta.append(adSatiri);

    const sag = el("div", "dolduran");
    if (durumDugumu) sag.append(durumDugumu);
    else sag.textContent = durumMetni;

    kutu.append(orta, sag);
    kap.append(kutu);
  }

  $("#ilerlemeOzet").textContent =
    `${tamamlanan} / ${ilerleme.satirlar.length} tamamlandı` +
    (ilerleme.artan.length ? `  ·  ${ilerleme.artan.length} fazladan ders` : "");
}

/* ------------------------------------------------------ çizim: ders listesi */

function suzgectenGecenler() {
  const arama = $("#arama").value.trim().toLocaleLowerCase("tr");
  const seciliGereksinimler = seciliGereksinimAnahtarlari();
  const alinaniGizle = $("#alinaniGizle").checked;
  const cakisaniGizle = $("#cakisaniGizle").checked;
  const doluGizle = $("#doluGizle").checked;
  const secililer = seciliDersler();

  return (durum.dersler?.dersler || []).filter((d) => {
    if (gizliMi(d.kod)) return false;
    if (arama) {
      const havuz = `${d.kod} ${d.ad} ${d.ogretimUyesi} ${d.crn}`.toLocaleLowerCase("tr");
      if (!havuz.includes(arama)) return false;
    }
    if (!dersFiltreAnahtarlari(d).some((anahtar) => seciliGereksinimler.has(anahtar))) return false;
    if (!d.plandaVar && secimeBagliKapaliBranslar.has(bransKodu(d.kod))) return false;
    if (alinaniGizle && alindiMi(d.kod)) return false;
    if (doluGizle && d.kontenjan > 0 && d.yazilan >= d.kontenjan) return false;
    if (cakisaniGizle && !aktifCrnler().includes(d.crn)) {
      if (secililer.some((s) => s.kod !== d.kod && cakisirMi(s, d))) return false;
    }
    return true;
  });
}

function cizDersListesi() {
  const kap = $("#dersListesi");
  kap.replaceChildren();

  const hepsi = durum.dersler?.dersler || [];
  const liste = suzgectenGecenler();
  $("#dersSayisi").textContent = `${liste.length} / ${hepsi.length} kayıt`;

  if (!liste.length) {
    kap.append(el("div", "bos", hepsi.length ? "Süzgeçlere uyan ders yok." : "Ders verisi yok."));
    return;
  }

  const secililer = seciliDersler();

  for (const ders of liste) {
    const secili = aktifCrnler().includes(ders.crn);
    const alindi = alindiMi(ders.kod);
    const cakisan = !secili && secililer.some((s) => s.kod !== ders.kod && cakisirMi(s, ders));

    const satir = el("div", "ders");
    if (secili) satir.classList.add("secili");
    else if (cakisan) satir.classList.add("cakisan");
    if (alindi) satir.classList.add("alindi");

    const orta = el("div", "orta");
    const ustSatir = el("div");
    ustSatir.append(el("span", "kod", ders.kod), document.createTextNode(" "), el("span", "crn", `CRN ${ders.crn}`));
    orta.append(ustSatir, el("div", "ad", ders.ad));

    const alt = el("div", "alt");
    alt.append(el("span", "saat", saatMetni(ders)));
    if (ders.ogretimUyesi) alt.append(el("span", "hoca", "· " + ders.ogretimUyesi));

    for (const ad of dersRozetAdlari(ders)) alt.append(el("span", `rozet ${gereksinimRozetRengi(ad)}`, ad));
    if (!ders.plandaVar) {
      const etiket = serbestGereksinimEtiketi();
      alt.append(el("span", `rozet ${gereksinimRozetRengi(etiket)}`, etiket));
      alt.append(el("span", "danisman-onayi", "Danışman onayı"));
    }
    if (alindi) alt.append(el("span", "rozet yesil", "bu dersi aldın"));
    if (cakisan) alt.append(el("span", "rozet kirmizi", "çakışıyor"));
    orta.append(alt);

    const sag = el("div", "sag");
    const dolu = ders.kontenjan > 0 && ders.yazilan >= ders.kontenjan;
    sag.append(el("div", "kontenjan" + (dolu ? " dolu" : ""), `${ders.yazilan} / ${ders.kontenjan}`));

    const dugme = el("button", "dugme kucuk" + (secili ? "" : " birincil"), secili ? "Kaldır" : "Seç");
    dugme.addEventListener("click", () => secimDegistir(ders));
    const gizle = el("button", "dugme kucuk sessiz", "Gizle");
    gizle.title = "Bu ders kodunu listeden gizle";
    gizle.addEventListener("click", () => dersiGizle(ders));
    sag.append(dugme, gizle);

    satir.addEventListener("mouseenter", () => ipucuAc(ders, satir));
    satir.addEventListener("mouseleave", ipucuGizleGecikmeli);

    satir.append(orta, sag);
    kap.append(satir);
  }
}

/* -------------------------------------------- aynı gün ipucu (fare üstünde) */

let ipucuKutusu = null;
let ipucuCrn = null;
let ipucuAcZaman = null;
let ipucuGizleZaman = null;

function ipucuHazirla() {
  if (ipucuKutusu) return ipucuKutusu;
  ipucuKutusu = el("div", "gun-ipucu gizli");
  ipucuKutusu.addEventListener("mouseenter", () => clearTimeout(ipucuGizleZaman));
  ipucuKutusu.addEventListener("mouseleave", ipucuGizleGecikmeli);
  document.body.append(ipucuKutusu);
  return ipucuKutusu;
}

/** Verilen dersle aynı gün(ler)de olup saatleri çakışmayan diğer dersler. */
function ayniGunAdaylari(ders) {
  const gunler = [...new Set(araliklar(ders).map((a) => a.gun))];
  if (!gunler.length) return { gunler, adaylar: [] };

  const adaylar = (durum.dersler?.dersler || []).filter((aday) => {
    if (aday.crn === ders.crn || aday.kod === ders.kod) return false;
    if (alindiMi(aday.kod)) return false;
    if (!araliklar(aday).some((a) => gunler.includes(a.gun))) return false;
    return !cakisirMi(ders, aday);
  });

  adaylar.sort((a, b) => anaBransOnce(a) - anaBransOnce(b) || a.kod.localeCompare(b.kod, "tr") || a.crn.localeCompare(b.crn));
  return { gunler, adaylar };
}

/** Sadece ilgilenilen günlere düşen saatleri yazar. */
function gunSaatMetni(ders, gunler) {
  return araliklar(ders)
    .filter((a) => gunler.includes(a.gun))
    .map(
      (a) =>
        `${KISA[a.gun] || a.gun} ` +
        `${String(Math.floor(a.bas / 60)).padStart(2, "0")}:${String(a.bas % 60).padStart(2, "0")}` +
        `–${String(Math.floor(a.bit / 60)).padStart(2, "0")}:${String(a.bit % 60).padStart(2, "0")}`
    )
    .join("  ·  ");
}

function ipucuIcerik(ders) {
  const kutu = ipucuHazirla();
  kutu.replaceChildren();

  const { gunler, adaylar } = ayniGunAdaylari(ders);

  const baslik = el("div", "gun-ipucu-baslik");
  baslik.append(el("b", null, ders.kod));
  baslik.append(
    el(
      "span",
      null,
      gunler.length
        ? ` · ${gunler.join(", ")} günü çakışmayanlar`
        : " · dersin programı belirtilmemiş"
    )
  );
  kutu.append(baslik);

  if (!adaylar.length) {
    kutu.append(
      el(
        "div",
        "gun-ipucu-bos",
        gunler.length
          ? "Aynı gün alabileceğin başka ders yok."
          : "Gün/saat bilgisi olmadığı için öneri çıkarılamıyor."
      )
    );
    return;
  }

  const secililer = seciliDersler();
  const liste = el("div", "gun-ipucu-liste");

  for (const aday of adaylar) {
    const secili = aktifCrnler().includes(aday.crn);
    const secimleCakisan =
      !secili && secililer.some((s) => s.kod !== aday.kod && cakisirMi(s, aday));

    const satir = el("button", "gun-ipucu-satir");
    satir.type = "button";
    if (secili) satir.classList.add("secili");
    if (secimleCakisan) satir.classList.add("cakisan");

    const ust = el("div", "gun-ipucu-ust");
    ust.append(el("span", "kod", aday.kod), el("span", "crn", `CRN ${aday.crn}`));
    const dolu = aday.kontenjan > 0 && aday.yazilan >= aday.kontenjan;
    ust.append(
      el("span", "gun-ipucu-kontenjan" + (dolu ? " dolu" : ""), `${aday.yazilan}/${aday.kontenjan}`)
    );
    satir.append(ust);

    satir.append(el("div", "gun-ipucu-ad", aday.ad));
    satir.append(el("div", "gun-ipucu-saat", gunSaatMetni(aday, gunler)));

    const alt = el("div", "gun-ipucu-alt");
    if (aday.ogretimUyesi) alt.append(el("span", "hoca", aday.ogretimUyesi));
    const paketler = dersRozetAdlari(aday);
    if (!aday.plandaVar) paketler.push(serbestGereksinimEtiketi());
    for (const paket of [...new Set(paketler)]) {
      alt.append(el("span", `rozet paket ${gereksinimRozetRengi(paket)}`, paket));
    }
    if (secili) alt.append(el("span", "rozet mavi", "seçili — kaldır"));
    else if (secimleCakisan) alt.append(el("span", "rozet kirmizi", "seçiminle çakışır"));
    else alt.append(el("span", "rozet yesil", "ekle"));
    satir.append(alt);

    satir.addEventListener("click", () => {
      secimDegistir(aday);
      const guncel = dersBul(ipucuCrn);
      if (guncel) ipucuIcerik(guncel); // kutu açık kalsın, durumlar tazelensin
    });

    liste.append(satir);
  }

  kutu.append(liste);
}

function ipucuKonumla(satir) {
  const kutu = ipucuKutusu;
  kutu.classList.remove("gizli");
  const r = satir.getBoundingClientRect();
  const k = kutu.getBoundingClientRect();

  let sol = r.right + 10;
  if (sol + k.width > window.innerWidth - 8) sol = r.left - k.width - 10;
  if (sol < 8) sol = Math.max(8, window.innerWidth - k.width - 8);

  let ust = Math.min(r.top, window.innerHeight - k.height - 8);
  ust = Math.max(8, ust);

  kutu.style.left = `${sol}px`;
  kutu.style.top = `${ust}px`;
}

function ipucuAc(ders, satir) {
  clearTimeout(ipucuGizleZaman);
  clearTimeout(ipucuAcZaman);
  ipucuAcZaman = setTimeout(() => {
    ipucuCrn = ders.crn;
    ipucuIcerik(ders);
    ipucuKonumla(satir);
  }, 180);
}

function ipucuGizle() {
  clearTimeout(ipucuAcZaman);
  ipucuCrn = null;
  if (ipucuKutusu) ipucuKutusu.classList.add("gizli");
}

function ipucuGizleGecikmeli() {
  clearTimeout(ipucuAcZaman);
  clearTimeout(ipucuGizleZaman);
  ipucuGizleZaman = setTimeout(ipucuGizle, 220);
}

function secimDegistir(ders) {
  const profil = aktifProfil();
  if (profil.crnler.includes(ders.crn)) {
    profil.crnler = profil.crnler.filter((c) => c !== ders.crn);
  } else {
    // Aynı dersin başka bir şubesi seçiliyse onun yerine geçsin
    profil.crnler = profil.crnler.filter((crn) => dersBul(crn)?.kod !== ders.kod);
    profil.crnler.push(ders.crn);
  }
  secimKaydet();
  ciz();
}

async function dersiGizle(ders) {
  if (!gizliMi(ders.kod)) durum.gizlenen.push(ders.kod);
  const profil = aktifProfil();
  profil.crnler = profil.crnler.filter((crn) => dersBul(crn)?.kod !== ders.kod);
  await Promise.all([gizlenenKaydet(), secimKaydet()]);
  ciz();
}

async function dersiGoster(kod) {
  durum.gizlenen = durum.gizlenen.filter((gizliKod) => gizliKod !== kod);
  await gizlenenKaydet();
  ciz();
}

/* --------------------------------------------------- çizim: haftalık program */

/** Bir gündeki ders aralıklarını çakışma durumlarına göre alt sütunlara (yan yana) yerleştirir. */
function aralikSutunlariniHesapla(gununAraliklari) {
  if (!gununAraliklari.length) return [];

  const sirali = [...gununAraliklari].sort(
    (a, b) => a.bas - b.bas || b.bit - a.bit || a.ders.kod.localeCompare(b.ders.kod, "tr")
  );

  const kumeler = [];
  let mevcutKume = [];
  let kumeBit = -1;

  for (const a of sirali) {
    if (!mevcutKume.length) {
      mevcutKume.push(a);
      kumeBit = a.bit;
    } else if (a.bas < kumeBit) {
      mevcutKume.push(a);
      kumeBit = Math.max(kumeBit, a.bit);
    } else {
      kumeler.push(mevcutKume);
      mevcutKume = [a];
      kumeBit = a.bit;
    }
  }
  if (mevcutKume.length) kumeler.push(mevcutKume);

  const yerlesimler = [];

  for (const kume of kumeler) {
    const kolonBitisleri = [];
    const kumeSonuclari = [];

    for (const a of kume) {
      let kolonIndex = kolonBitisleri.findIndex((bit) => bit <= a.bas);
      if (kolonIndex === -1) {
        kolonIndex = kolonBitisleri.length;
        kolonBitisleri.push(a.bit);
      } else {
        kolonBitisleri[kolonIndex] = a.bit;
      }
      kumeSonuclari.push({ aralik: a, kolon: kolonIndex });
    }

    const toplamKolon = kolonBitisleri.length;
    for (const item of kumeSonuclari) {
      const cakismaVar = kume.some(
        (b) => b !== item.aralik && item.aralik.bas < b.bit && b.bas < item.aralik.bit
      );
      yerlesimler.push({
        aralik: item.aralik,
        kolon: item.kolon,
        toplamKolon: cakismaVar ? toplamKolon : 1,
        cakismaVar,
      });
    }
  }

  return yerlesimler;
}

function cizProgram() {
  const kap = $("#program");
  kap.replaceChildren();
  const secililer = seciliDersler();

  const tumAralik = secililer.flatMap((d) => araliklar(d).map((a) => ({ ...a, ders: d })));
  if (!tumAralik.length) {
    kap.append(el("div", "bos", "Ders seçtikçe haftalık programın burada oluşur."));
    $("#cakismaUyari").classList.add("gizli");
    return;
  }

  const gunler = HAFTA.slice(0, 5);
  for (const a of tumAralik) if (!gunler.includes(a.gun)) gunler.push(a.gun);
  gunler.sort((x, y) => HAFTA.indexOf(x) - HAFTA.indexOf(y));

  const bas = Math.min(8 * 60 + 30, ...tumAralik.map((a) => a.bas));
  const bit = Math.max(17 * 60 + 30, ...tumAralik.map((a) => a.bit));
  const basSaat = Math.floor(bas / 60);
  const bitSaat = Math.ceil(bit / 60);
  const oran = 0.72; // piksel / dakika
  const yukseklik = (bitSaat - basSaat) * 60 * oran;

  const izgara = el("div", "program-izgara");
  izgara.style.gridTemplateColumns = `52px repeat(${gunler.length}, minmax(105px, 1fr))`;

  izgara.append(el("div"));
  for (const gun of gunler) izgara.append(el("div", "gun-basi", gun));

  const saatSutunu = el("div", "saat-sutunu");
  saatSutunu.style.height = `${yukseklik}px`;
  for (let s = basSaat; s <= bitSaat; s++) {
    const etiket = el("div", "saat-etiket", `${String(s).padStart(2, "0")}:00`);
    etiket.style.top = `${(s - basSaat) * 60 * oran}px`;
    saatSutunu.append(etiket);
  }
  izgara.append(saatSutunu);

  let cakismaVar = false;

  for (const gun of gunler) {
    const sutun = el("div", "gun-sutunu");
    sutun.style.height = `${yukseklik}px`;
    for (let s = basSaat; s <= bitSaat; s++) {
      const cizgi = el("div", "saat-cizgi");
      cizgi.style.top = `${(s - basSaat) * 60 * oran}px`;
      sutun.append(cizgi);
    }

    const yerlesimler = aralikSutunlariniHesapla(tumAralik.filter((a) => a.gun === gun));
    for (const y of yerlesimler) {
      const a = y.aralik;
      if (y.cakismaVar) cakismaVar = true;

      const siniflar = ["blok"];
      if (y.cakismaVar) siniflar.push("cakisan");
      if (y.toplamKolon > 1) siniflar.push("yan-yana");

      const blok = el("div", siniflar.join(" "));
      blok.style.top = `${(a.bas - basSaat * 60) * oran}px`;
      blok.style.height = `${Math.max(22, (a.bit - a.bas) * oran - 3)}px`;

      if (y.toplamKolon > 1) {
        const pay = 100 / y.toplamKolon;
        blok.style.left = `calc(${y.kolon * pay}% + 2px)`;
        blok.style.width = `calc(${pay}% - 4px)`;
      } else {
        blok.style.left = "3px";
        blok.style.width = "calc(100% - 6px)";
      }

      blok.append(el("b", "blok-kod", a.ders.kod));
      blok.append(el("span", "blok-ad", a.ders.ad || ""));
      if (a.ders.ogretimUyesi) blok.append(el("span", "blok-hoca", a.ders.ogretimUyesi));
      blok.title = `${a.ders.kod} — ${a.ders.ad}\nCRN ${a.ders.crn}\n${a.ders.ogretimUyesi}\nDerslik: ${a.derslik || "—"}\nTıklayınca programdan çıkarılır.`;
      blok.addEventListener("click", () => secimDegistir(a.ders));
      sutun.append(blok);
    }
    izgara.append(sutun);
  }

  kap.append(izgara);
  $("#cakismaUyari").classList.toggle("gizli", !cakismaVar);
}

/* ----------------------------------------------------------- yer imi (CRN) */

/** ÖBS ders kayıt ekranındaki CRN kutucuklarını dolduran bookmarklet adresi.
 *
 *  Kodun kendisi sabittir ve okunur hâliyle durur; sürümden sürüme değişen tek
 *  şey `crn` dizisinin içeriğidir. CRN'ler adrese gömülü olduğu için seçim
 *  değişince yer iminin yeniden sürüklenmesi gerekir. */
function yerImiAdresi(crnler) {
  const liste = crnler.map((c) => `'${String(c).replace(/[^0-9]/g, "")}'`).join(",");
  return (
    "javascript: (function () {            var crn = [" +
    liste +
    "];            const crninputs = document.querySelectorAll(\"input[type='number']\");" +
    "            for (var i = 0; i < crn.length; i++) {                if (crninputs[i]) {" +
    "                    crninputs[i].value = crn[i];" +
    "                    crninputs[i].dispatchEvent(new Event('input', { bubbles: true }));" +
    "                }            }            void (0);        })();"
  );
}

function cizYerImi() {
  const bag = $("#crnYerImi");
  const crnler = aktifCrnler();
  const profilAdi = aktifProfil()?.ad || "";

  bag.textContent = crnler.length ? `⇱ CRN doldur · ${profilAdi}` : "⇱ CRN doldur";
  bag.classList.toggle("pasif", !crnler.length);
  bag.setAttribute("href", crnler.length ? yerImiAdresi(crnler) : "javascript:void(0)");
  bag.title = crnler.length
    ? `${crnler.length} CRN: ${crnler.join(" ")}\nYer imi çubuğuna sürükle`
    : "Önce ders seç";
}

/* ------------------------------------------------------ çizim: seçim listesi */

function cizSecim() {
  const kap = $("#secimListesi");
  kap.replaceChildren();
  const secililer = seciliDersler();
  $("#aktifProfilAdi").textContent = `· ${aktifProfil()?.ad || ""}`;

  if (!secililer.length) {
    kap.append(el("div", "bos", "Henüz ders seçmedin."));
  }

  for (const ders of secililer) {
    const satir = el("div", "secim");
    const orta = el("div", "orta");
    const ust = el("div", "ust-satir");
    ust.append(el("span", "kod", ders.kod), el("span", "crn", `CRN ${ders.crn}`));
    orta.append(ust, el("div", "soluk", `${ders.ad} · ${saatMetni(ders)}`));

    const sil = el("button", "dugme kucuk sessiz", "Kaldır");
    sil.addEventListener("click", () => secimDegistir(ders));
    satir.append(orta, sil);
    kap.append(satir);
  }

  $("#crnKutusu").value = aktifCrnler().join(" ");
  cizYerImi();
  const kredi = secililer.reduce((toplam, d) => {
    const plandaki = (durum.plan?.gereksinimler || [])
      .flatMap((g) => g.dersler)
      .find((pd) => pd.kod === d.kod);
    return toplam + (plandaki?.kredi || 0);
  }, 0);
  $("#secimOzet").textContent = `${secililer.length} ders${kredi ? `  ·  ${kredi} kredi (plandan)` : ""}`;
}

/* ---------------------------------------------------- çizim: gizlenenler */

function cizGizlenen() {
  const kap = $("#gizlenenListesi");
  if (!kap) return;
  kap.replaceChildren();
  $("#gizlenenSayisi").textContent = durum.gizlenen.length ? `${durum.gizlenen.length} ders` : "";

  if (!durum.gizlenen.length) {
    kap.append(el("div", "bos", "Gizlediğin dersler burada görünür."));
    return;
  }

  const dersler = durum.dersler?.dersler || [];
  for (const kod of [...durum.gizlenen].sort()) {
    const ders = dersler.find((d) => d.kod === kod);
    const ad = ders?.ad || dersAdi(kod);
    const satir = el("div", "gizlenen");
    const orta = el("div", "orta");
    orta.append(el("div", "kod", kod));
    if (ad) orta.append(el("div", "soluk", ad));

    const goster = el("button", "dugme kucuk", "Göster");
    goster.addEventListener("click", () => dersiGoster(kod));
    satir.append(orta, goster);
    kap.append(satir);
  }
}

/* -------------------------------------------------------- çizim: yan panel */

function cizAlinan() {
  const kap = $("#alinanListesi");
  kap.replaceChildren();

  if (!durum.alinan.length) {
    kap.append(el("div", "bos", "Henüz ders eklemedin."));
    return;
  }

  durum.alinan.forEach((ders, sira) => {
    const satir = el("div", "alinan");
    const orta = el("div", "orta");
    orta.append(el("div", "kod", ders.kod));
    const ayrinti = [ders.ad, ders.donem, ders.harfNotu].filter(Boolean).join(" · ");
    if (ayrinti) orta.append(el("div", "soluk", ayrinti));

    const sil = el("button", "sil", "×");
    sil.title = "Listeden çıkar";
    sil.addEventListener("click", async () => {
      durum.alinan.splice(sira, 1);
      await alinanKaydet();
      ciz();
    });

    satir.append(orta, sil);
    kap.append(satir);
  });
}

function cizSecenekler() {
  const suzgec = $("#gereksinimSuzgeci");
  const onceki = [...suzgec.querySelectorAll(".suzgec-grup-input:checked")].map((girdi) => girdi.value);
  const ilkCizim = !suzgec.querySelector(".suzgec-grup-input");
  suzgec.replaceChildren();

  const gruplar = [];
  const gorulenGruplar = new Set();
  for (const g of durum.plan?.gereksinimler || []) {
    const ad = gereksinimGrubu(g.ad);
    if (!ad || gorulenGruplar.has(ad)) continue;
    gorulenGruplar.add(ad);
    gruplar.push({ anahtar: ad, etiket: gereksinimGrupEtiketi(ad) });
  }
  if (!gruplar.some((g) => g.anahtar === serbestGereksinimAnahtari())) {
    gruplar.push({ anahtar: "__serbest__", etiket: serbestGereksinimEtiketi() });
  }

  const secili = ilkCizim ? new Set(gruplar.map((g) => g.anahtar)) : new Set(onceki);
  const dugme = el("button", "suzgec-ac", null);
  dugme.type = "button";
  dugme.setAttribute("aria-expanded", "false");
  dugme.append(el("span", "suzgec-ac-metin", "Tüm gereksinimler"), el("span", "suzgec-ok", "▾"));

  const menu = el("div", "suzgec-menu");

  for (const grup of gruplar) {
    const etiket = el("label", "suzgec-kutu");
    const girdi = document.createElement("input");
    girdi.type = "checkbox";
    girdi.className = "suzgec-grup-input";
    girdi.value = grup.anahtar;
    girdi.checked = secili.has(grup.anahtar);
    girdi.addEventListener("change", () => {
      const altListe = menu.querySelector(`[data-alt-ust="${CSS.escape(grup.anahtar)}"]`);
      if (altListe) {
        altListe.classList.toggle("gizli", !girdi.checked);
      }
      guncelleGereksinimSuzgeciOzeti();
      cizDersListesi();
    });
    const renk = gereksinimRozetRengi(grup.etiket);
    const nokta = el("span", `suzgec-nokta ${renk}`);
    etiket.append(girdi, nokta, document.createTextNode(grup.etiket));
    menu.append(etiket);

    if (grup.anahtar === serbestGereksinimAnahtari()) {
      const altListe = el("div", "suzgec-alt-kodlar");
      altListe.dataset.altUst = grup.anahtar;
      altListe.classList.toggle("gizli", !girdi.checked);
      for (const brans of secimeBagliBranslar()) {
        const kodEtiket = el("label", "suzgec-kod");
        const kodGirdisi = document.createElement("input");
        kodGirdisi.type = "checkbox";
        kodGirdisi.className = "suzgec-kod-input";
        kodGirdisi.value = brans.brans;
        kodGirdisi.checked = !secimeBagliKapaliBranslar.has(brans.brans);
        kodGirdisi.addEventListener("change", () => {
          if (kodGirdisi.checked) secimeBagliKapaliBranslar.delete(brans.brans);
          else secimeBagliKapaliBranslar.add(brans.brans);
          bransSuzgeciKaydet();
          cizDersListesi();
        });

        const kod = el("span", "suzgec-kod-kod", brans.brans);
        const ad = el("span", "suzgec-kod-ad", `${brans.adet} ders`);
        kodEtiket.append(kodGirdisi, kod, ad);
        altListe.append(kodEtiket);
      }
      menu.append(altListe);
    }
  }

  dugme.addEventListener("click", () => {
    const acik = suzgec.classList.toggle("acik");
    dugme.setAttribute("aria-expanded", String(acik));
  });
  suzgec.append(dugme, menu);
  guncelleGereksinimSuzgeciOzeti();

  const liste = $("#planDersleri");
  liste.replaceChildren();
  const gorulen = new Set();
  for (const g of durum.plan?.gereksinimler || []) {
    for (const d of g.dersler) {
      if (gorulen.has(d.kod)) continue;
      gorulen.add(d.kod);
      const secenek = el("option");
      secenek.value = d.kod;
      secenek.label = d.ad;
      liste.append(secenek);
    }
  }
}

/* ------------------------------------------------------ çizim: profil seçici */

function cizProfiller() {
  const secici = $("#profilSecici");
  secici.replaceChildren();
  for (const profil of durum.secim.profiller) {
    const secenek = el("option", null, `${profil.ad} (${profil.crnler.length})`);
    secenek.value = profil.ad;
    secici.append(secenek);
  }
  secici.value = aktifProfil()?.ad || "";
  $("#profilSil").disabled = durum.secim.profiller.length < 2;
}

/* --------------------------------------------------------------- ana çizim */

function ciz() {
  cizUst();
  cizGereksinimler();
  cizDersListesi();
  cizProfiller();
  cizProgram();
  cizSecim();
  cizGizlenen();
  cizAlinan();
}

/* --------------------------------------------------------- veriyi tazeleme */

function bilgiGoster(metin, tur = "bilgi") {
  const uyari = $("#uyari");
  uyari.textContent = metin;
  uyari.classList.remove("gizli", "hata", "basari");
  if (tur !== "bilgi") uyari.classList.add(tur);
}

/** ÖBS'den açılan dersleri ve kontenjanları yeniden çeker. */
async function verileriYenile() {
  const dugme = $("#yenileDugmesi");
  if (dugme.disabled) return;

  if (durum.statikMod) {
    const cekilme = durum.dersler?.cekilme || "belirtilmemiş";
    bilgiGoster(
      `Canlı sitede dersler ve kontenjanlar GitHub Actions ile periyodik olarak otomatik güncellenir (Son güncelleme: ${cekilme}).`,
      "basari"
    );
    setTimeout(() => $("#uyari").classList.add("gizli"), 5000);
    return;
  }

  const eskiMetin = dugme.textContent;
  dugme.disabled = true;
  dugme.textContent = "⟳ Yenileniyor…";
  bilgiGoster("ÖBS'den güncel kontenjanlar ve ders listesi çekiliyor, birkaç saniye sürebilir…");

  try {
    const yanit = await fetch("/api/yenile", { method: "POST" });
    const sonuc = await yanit.json();
    if (!yanit.ok) throw new Error(sonuc.hata || `Sunucu ${yanit.status} döndü`);

    const oncekiCrnler = aktifCrnler();
    await veriYukle();
    cizSecenekler();
    ciz();

    // Kapanmış/kaldırılmış dersler seçimde kalmış olabilir
    const kayip = oncekiCrnler.filter((crn) => !dersBul(crn));
    bilgiGoster(
      `Güncellendi — ${sonuc.donem}, ${sonuc.adet} kayıt (${sonuc.cekilme}).` +
        (kayip.length
          ? `  Dikkat: ${kayip.join(", ")} CRN'leri artık listede yok, seçimden düştü.`
          : ""),
      kayip.length ? "" : "basari"
    );
    if (!kayip.length) setTimeout(() => $("#uyari").classList.add("gizli"), 4000);
  } catch (hata) {
    bilgiGoster(`Yenilenemedi: ${hata.message}. İnternet bağlantını kontrol et.`, "hata");
  } finally {
    dugme.disabled = false;
    dugme.textContent = eskiMetin;
  }
}

/* ------------------------------------------------------------- olay bağları */

function olaylariBagla() {
  $("#bolumSecici").addEventListener("change", async (olay) => {
    const secici = olay.target;
    secici.disabled = true;
    try {
      await bolumDegistir(secici.value);
    } catch (hata) {
      secici.value = durum.aktifBolum;
      bilgiGoster(`Bölüm değiştirilemedi: ${hata.message}`, "hata");
    } finally {
      secici.disabled = false;
    }
  });
  $("#veriDisariAktar").addEventListener("click", kisiselVeriDisariAktar);
  $("#veriIceriAktar").addEventListener("click", () => $("#veriDosyalari").click());
  $("#veriDosyalari").addEventListener("change", async (olay) => {
    try {
      await kisiselVeriIceriAktar([...olay.target.files]);
    } catch (hata) {
      bilgiGoster(`Veriler içe aktarılamadı: ${hata.message}`, "hata");
    } finally {
      olay.target.value = "";
    }
  });
  for (const secici of ["#arama", "#alinaniGizle", "#cakisaniGizle", "#doluGizle"]) {
    const dugum = $(secici);
    dugum.addEventListener(dugum.type === "search" ? "input" : "change", () => {
      cizDersListesi();
    });
  }

  document.addEventListener("click", (olay) => {
    const suzgec = $("#gereksinimSuzgeci");
    if (!suzgec || suzgec.contains(olay.target)) return;
    suzgec.classList.remove("acik");
    suzgec.querySelector(".suzgec-ac")?.setAttribute("aria-expanded", "false");
  });

  // Liste kaydırılınca / pencere boyutlanınca konum bozulmasın.
  // Kutunun kendi içindeki kaydırma bunu tetiklememeli.
  const kaydirmaGizle = (olay) => {
    if (ipucuKutusu && olay.target instanceof Node && ipucuKutusu.contains(olay.target)) return;
    ipucuGizle();
  };
  window.addEventListener("scroll", kaydirmaGizle, true);
  window.addEventListener("resize", ipucuGizle);

  $("#yenileDugmesi").addEventListener("click", verileriYenile);

  $("#alinanAc").addEventListener("click", () => {
    $("#yanPanel").classList.add("acik");
    $("#perde").classList.remove("gizli");
  });
  const kapat = () => {
    $("#yanPanel").classList.remove("acik");
    $("#perde").classList.add("gizli");
  };
  $("#alinanKapat").addEventListener("click", kapat);
  $("#perde").addEventListener("click", kapat);
  document.addEventListener("keydown", (olay) => {
    if (olay.key !== "Escape") return;
    kapat();
    const suzgec = $("#gereksinimSuzgeci");
    suzgec?.classList.remove("acik");
    suzgec?.querySelector(".suzgec-ac")?.setAttribute("aria-expanded", "false");
  });

  // Ders kodu kutusu boşaltılınca formun kalanı da temizlensin
  $("#yeniKod").addEventListener("input", (olay) => {
    if (olay.target.value.trim()) return;
    for (const secici of ["#yeniAd", "#yeniDonem", "#yeniNot"]) $(secici).value = "";
  });

  $("#yeniKod").addEventListener("change", (olay) => {
    const kod = olay.target.value.trim().toUpperCase();
    const plandaki = (durum.plan?.gereksinimler || []).flatMap((g) => g.dersler).find((d) => d.kod === kod);
    if (plandaki && !$("#yeniAd").value) $("#yeniAd").value = plandaki.ad;
  });

  $("#alinanForm").addEventListener("submit", async (olay) => {
    olay.preventDefault();
    const kod = $("#yeniKod").value.trim().replace(/\s+/g, " ").toUpperCase();
    if (!kod) return;
    if (alindiMi(kod)) {
      alert(`${kod} zaten listede.`);
      return;
    }
    const plandaki = (durum.plan?.gereksinimler || []).flatMap((g) => g.dersler).find((d) => d.kod === kod);
    durum.alinan.push({
      kod,
      ad: $("#yeniAd").value.trim() || plandaki?.ad || "",
      kredi: plandaki?.kredi ?? null,
      akts: plandaki?.akts ?? null,
      donem: $("#yeniDonem").value.trim(),
      harfNotu: $("#yeniNot").value.trim(),
    });
    await alinanKaydet();
    $("#alinanForm").reset();
    $("#yeniKod").focus();
    ciz();
  });

  /* --- program profilleri --- */

  $("#profilSecici").addEventListener("change", async (olay) => {
    durum.secim.aktif = olay.target.value;
    await secimKaydet();
    ciz();
  });

  $("#profilYeni").addEventListener("click", async () => {
    profilEkle();
    await secimKaydet();
    ciz();
  });

  $("#profilKopyala").addEventListener("click", async () => {
    const kaynak = aktifProfil();
    const ad = benzersizAd(`${kaynak.ad} kopya`);
    durum.secim.profiller.push({ ad, crnler: [...kaynak.crnler] });
    durum.secim.aktif = ad;
    await secimKaydet();
    ciz();
  });

  $("#profilAd").addEventListener("click", async () => {
    const profil = aktifProfil();
    const girilen = prompt("Program adı:", profil.ad);
    if (girilen === null) return;
    const yeni = girilen.trim();
    if (!yeni || yeni === profil.ad) return;
    if (durum.secim.profiller.some((p) => p !== profil && p.ad === yeni)) {
      alert(`"${yeni}" adında bir program zaten var.`);
      return;
    }
    profil.ad = yeni;
    durum.secim.aktif = yeni;
    await secimKaydet();
    ciz();
  });

  $("#profilSil").addEventListener("click", async () => {
    if (durum.secim.profiller.length < 2) return;
    const profil = aktifProfil();
    if (!confirm(`"${profil.ad}" silinsin mi? (${profil.crnler.length} ders)`)) return;
    durum.secim.profiller = durum.secim.profiller.filter((p) => p !== profil);
    durum.secim.aktif = durum.secim.profiller[0].ad;
    await secimKaydet();
    ciz();
  });

  $("#secimTemizle").addEventListener("click", async () => {
    const profil = aktifProfil();
    if (!profil.crnler.length) return;
    profil.crnler = [];
    await secimKaydet();
    ciz();
  });

  // Bağlantının amacı sürüklenmek; sayfa içinde tıklanınca kodu panoya kopyalar.
  $("#crnYerImi").addEventListener("click", async (olay) => {
    olay.preventDefault();
    const crnler = aktifCrnler();
    if (!crnler.length) return;
    const bag = $("#crnYerImi");
    const eskiMetin = bag.textContent;
    try {
      await navigator.clipboard.writeText(yerImiAdresi(crnler));
      bag.textContent = "Kod panoya kopyalandı";
    } catch {
      bag.textContent = "Kopyalanamadı — bağlantıyı sürükle";
    }
    setTimeout(cizYerImi, 1800);
    void eskiMetin;
  });

  $("#crnKopyala").addEventListener("click", async () => {
    if (!aktifCrnler().length) return;
    try {
      await navigator.clipboard.writeText(aktifCrnler().join(" "));
    } catch {
      $("#crnKutusu").select();
      document.execCommand("copy");
    }
    const dugme = $("#crnKopyala");
    dugme.textContent = "Kopyalandı";
    setTimeout(() => (dugme.textContent = "Kopyala"), 1400);
  });
}

/* ------------------------------------------------------------------ başlat */

(async function baslat() {
  const oturumVar = await window.DSPAuth.baslat();
  if (!oturumVar) return;
  olaylariBagla();
  try {
    await veriYukle();
  } catch (hata) {
    $("#uyari").textContent = "Sunucudan veri alınamadı: " + hata;
    $("#uyari").classList.remove("gizli");
  }
  cizSecenekler();
  ciz();
})();
