"use strict";

const DSPAuth = (() => {
  const ayar = window.DSP_CONFIG || {};
  const yerel = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const yapilandirildi = Boolean(ayar.supabaseUrl && ayar.supabasePublishableKey);
  const istemci = yapilandirildi && window.supabase
    ? window.supabase.createClient(ayar.supabaseUrl, ayar.supabasePublishableKey)
    : null;
  let kayitZinciri = Promise.resolve();
  let kullanici = yerel && !istemci
    ? { id: "yerel", email: "Yerel kullanım", user_metadata: { display_name: "Yerel kullanıcı" } }
    : null;

  const $ = (secici) => document.querySelector(secici);

  function mesaj(metin, hata = false) {
    const alan = $("#girisMesaji");
    alan.textContent = metin || "";
    alan.classList.toggle("hata", hata);
    alan.classList.toggle("gizli", !metin);
  }

  function yukleniyor(aktif) {
    document.querySelectorAll("#girisEkrani button").forEach((dugme) => {
      dugme.disabled = aktif;
    });
  }

  function sekmeGoster(kayit) {
    $("#girisFormu").classList.toggle("gizli", kayit);
    $("#kayitFormu").classList.toggle("gizli", !kayit);
    $("#girisSekmesi").classList.toggle("aktif", !kayit);
    $("#kayitSekmesi").classList.toggle("aktif", kayit);
    mesaj("");
  }

  function profilAdiniGuncelle() {
    const ad = kullanici?.user_metadata?.display_name || kullanici?.email?.split("@")[0] || "Profilim";
    $("#profilAdi").textContent = ad;
    $("#profilMenuAdi").textContent = ad;
    $("#profilEposta").textContent = kullanici?.email || "Bu bilgisayardaki yerel profil";
    $("#profilHarf").textContent = ad.trim().charAt(0).toLocaleUpperCase("tr") || "P";
  }

  function ekranGoster(oturumVar) {
    $("#girisEkrani").classList.toggle("gizli", oturumVar);
    $("#uygulama").classList.toggle("gizli", !oturumVar);
    if (oturumVar) profilAdiniGuncelle();
  }

  function sifreYenilemeGoster(oturum) {
    kullanici = oturum?.user || kullanici;
    $("#girisFormlari").classList.remove("gizli");
    $("#girisFormu").classList.add("gizli");
    $("#kayitFormu").classList.add("gizli");
    $("#sifreYenileFormu").classList.remove("gizli");
    $(".giris-sekmeler").classList.add("gizli");
    $("#girisEkrani").classList.remove("gizli");
    $("#uygulama").classList.add("gizli");
    mesaj("Yeni şifreni belirle.");
  }

  async function baslat() {
    olaylariBagla();
    if (!istemci) {
      if (yerel) {
        ekranGoster(true);
        return true;
      }
      $("#girisFormlari").classList.add("gizli");
      mesaj(yapilandirildi
        ? "Giriş servisi yüklenemedi. Bağlantını kontrol edip sayfayı yenile."
        : "Hesap sistemi henüz yapılandırılmadı. Site yöneticisi Supabase bağlantısını tamamlamalı.", true);
      ekranGoster(false);
      return false;
    }

    istemci.auth.onAuthStateChange((olay, oturum) => {
      if (olay !== "PASSWORD_RECOVERY") return;
      sifreYenilemeGoster(oturum);
    });

    const { data, error } = await istemci.auth.getSession();
    if (error) mesaj(error.message, true);
    kullanici = data.session?.user || null;
    const sifreKurtarma = window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery");
    if (sifreKurtarma && data.session) {
      sifreYenilemeGoster(data.session);
      return false;
    }
    ekranGoster(Boolean(kullanici));
    return Boolean(kullanici);
  }

  async function profilYukle() {
    if (!istemci || !kullanici || kullanici.id === "yerel") return null;
    const { data, error } = await istemci
      .from("user_profiles")
      .select("display_name, alinan, secim, gizlenen, kapali_branslar")
      .eq("user_id", kullanici.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function profilKaydet(veri) {
    if (!istemci || !kullanici || kullanici.id === "yerel") return;
    const veriKopyasi = JSON.parse(JSON.stringify(veri));
    const userId = kullanici.id;
    const displayName = kullanici.user_metadata?.display_name || kullanici.email?.split("@")[0] || "Kullanıcı";
    const islem = kayitZinciri.catch(() => {}).then(async () => {
      const { error } = await istemci.from("user_profiles").upsert({
        user_id: userId,
        display_name: displayName,
        alinan: veriKopyasi.alinan,
        secim: veriKopyasi.secim,
        gizlenen: veriKopyasi.gizlenen,
        kapali_branslar: veriKopyasi.kapaliBranslar,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
    });
    kayitZinciri = islem;
    return islem;
  }

  function olaylariBagla() {
    $("#girisSekmesi").addEventListener("click", () => sekmeGoster(false));
    $("#kayitSekmesi").addEventListener("click", () => sekmeGoster(true));
    $("#profilDugmesi").addEventListener("click", () => $("#profilMenu").classList.toggle("gizli"));
    document.addEventListener("click", (olay) => {
      if (!olay.target.closest(".profil-alani")) $("#profilMenu").classList.add("gizli");
    });

    $("#girisFormu").addEventListener("submit", async (olay) => {
      olay.preventDefault();
      yukleniyor(true);
      mesaj("");
      const form = new FormData(olay.currentTarget);
      const { data, error } = await istemci.auth.signInWithPassword({
        email: String(form.get("email") || "").trim(),
        password: String(form.get("password") || ""),
      });
      yukleniyor(false);
      if (error) return mesaj("Giriş yapılamadı. E-posta ve şifreni kontrol et.", true);
      kullanici = data.user;
      window.location.reload();
    });

    $("#kayitFormu").addEventListener("submit", async (olay) => {
      olay.preventDefault();
      yukleniyor(true);
      mesaj("");
      const form = new FormData(olay.currentTarget);
      const password = String(form.get("password") || "");
      if (password.length < 8) {
        yukleniyor(false);
        return mesaj("Şifre en az 8 karakter olmalı.", true);
      }
      const { data, error } = await istemci.auth.signUp({
        email: String(form.get("email") || "").trim(),
        password,
        options: {
          data: { display_name: String(form.get("displayName") || "").trim() },
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      yukleniyor(false);
      if (error) return mesaj(error.message, true);
      if (!data.session) return mesaj("Kayıt oluşturuldu. E-postana gelen doğrulama bağlantısını aç.");
      kullanici = data.user;
      window.location.reload();
    });

    $("#sifreYenileFormu").addEventListener("submit", async (olay) => {
      olay.preventDefault();
      const password = String(new FormData(olay.currentTarget).get("password") || "");
      if (password.length < 8) return mesaj("Şifre en az 8 karakter olmalı.", true);
      const { error } = await istemci.auth.updateUser({ password });
      if (error) return mesaj(error.message, true);
      mesaj("Şifren yenilendi. Panele yönlendiriliyorsun.");
      setTimeout(() => window.location.assign(window.location.pathname), 900);
    });

    $("#sifreUnuttum").addEventListener("click", async () => {
      const email = $("#girisEposta").value.trim();
      if (!email) return mesaj("Önce e-posta adresini yaz.", true);
      const { error } = await istemci.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      mesaj(error ? error.message : "Şifre yenileme bağlantısı e-postana gönderildi.", Boolean(error));
    });

    $("#cikisDugmesi").addEventListener("click", async () => {
      await kayitZinciri.catch(() => {});
      if (istemci) await istemci.auth.signOut();
      window.location.reload();
    });
  }

  return {
    baslat,
    profilYukle,
    profilKaydet,
    kullaniciId: () => kullanici?.id || null,
    uzakProfil: () => Boolean(istemci && kullanici?.id && kullanici.id !== "yerel"),
  };
})();

window.DSPAuth = DSPAuth;
