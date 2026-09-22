// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const izinliKaynaklar = new Set([
  "https://muhal1.github.io",
  "http://127.0.0.1:8730",
  "http://localhost:8730",
]);

function cors(req: Request): Record<string, string> {
  const kaynak = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": izinliKaynaklar.has(kaynak) ? kaynak : "https://muhal1.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, govde: Record<string, unknown>, status = 200): Response {
  return Response.json(govde, { status, headers: cors(req) });
}

const yetkiliIsleyici = withSupabase({ auth: "user" }, async (req, ctx) => {
  const appMetadata = ctx.userClaims?.appMetadata || {};
  if (appMetadata.role !== "admin") {
    return json(req, { hata: "Bu işlem için yönetici yetkisi gerekiyor." }, 403);
  }

  let govde: { action?: string } = {};
  try {
    govde = await req.json();
  } catch {
    return json(req, { hata: "Geçersiz istek." }, 400);
  }
  if (govde.action !== "dispatch") {
    return json(req, { hata: "Bilinmeyen işlem." }, 400);
  }

  const githubToken = Deno.env.get("GITHUB_ACTIONS_TOKEN");
  if (!githubToken) {
    console.error("GITHUB_ACTIONS_TOKEN tanımlı değil");
    return json(req, { hata: "Yenileme servisi henüz yapılandırılmamış." }, 503);
  }

  const api = "https://api.github.com/repos/muhal1/crn-atlas/actions/workflows/deploy.yml";
  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "crn-atlas-refresh",
  };

  const calisanYanit = await fetch(`${api}/runs?per_page=10`, { headers });
  if (!calisanYanit.ok) {
    console.error("GitHub çalışma durumu okunamadı", calisanYanit.status, await calisanYanit.text());
    return json(req, { hata: "GitHub çalışma durumu okunamadı." }, 502);
  }
  const calisanlar = await calisanYanit.json() as { workflow_runs?: Array<{ status?: string }> };
  if (calisanlar.workflow_runs?.some((run) => run.status === "queued" || run.status === "in_progress")) {
    return json(req, { tamam: true, zatenCalisiyor: true });
  }

  const dispatchYanit = await fetch(`${api}/dispatches`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!dispatchYanit.ok) {
    console.error("GitHub yenilemesi başlatılamadı", dispatchYanit.status, await dispatchYanit.text());
    return json(req, { hata: "GitHub yenileme görevi başlatılamadı." }, 502);
  }

  let sonuc: Record<string, unknown> = {};
  if (dispatchYanit.headers.get("content-type")?.includes("application/json")) {
    sonuc = await dispatchYanit.json() as Record<string, unknown>;
  }
  return json(req, {
    tamam: true,
    zatenCalisiyor: false,
    calismaAdresi: sonuc.html_url || null,
  }, 202);
});

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
    if (req.method !== "POST") return json(req, { hata: "Yalnızca POST desteklenir." }, 405);
    return yetkiliIsleyici(req);
  },
};
