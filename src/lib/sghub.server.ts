const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbydLC4efp0p_EWh0XTFA9YEVwiKvTm3jVayU3rC8yaxLzupU_eP2PJkrGlAkdwmfq8d/exec";

const IMGBB_API_KEY =
  process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || "fc7a049d22afc785b615ecde51392119";

interface AppsScriptResult {
  ok: boolean;
  status: number;
  payload?: unknown;
  raw?: string;
  error?: string;
}

const HTML_RESPONSE_ERROR = "Apps Script retornou HTML (ação não gravou).";

function toAppsScriptParamValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function buildParams(body: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    params.append(key, toAppsScriptParamValue(value));
  });
  return params;
}

async function fetchAppsScript(url: string, options?: RequestInit): Promise<AppsScriptResult> {
  try {
    const response = await fetch(url, { redirect: "follow", ...options });
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json") || /^[\s\n\r]*[\{\[]/.test(text)) {
      try {
        const payload = JSON.parse(text);
        return { ok: response.ok, status: response.status, payload, raw: text, error: response.ok ? undefined : `Apps Script retornou HTTP ${response.status}.` };
      } catch {
        return { ok: false, status: response.status, raw: text, error: "Resposta JSON inválida do Apps Script." };
      }
    }

    // Any HTML response (including "The script completed but did not return
    // anything.") means the action produced no JSON output. Mutations on this
    // Apps Script deployment only persist through the querystring fallback.
    return { ok: false, status: response.status, raw: text, error: HTML_RESPONSE_ERROR };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Falha de rede ao chamar Apps Script.",
    };
  }
}

export async function callAppsScriptGET(query?: Record<string, string>): Promise<unknown> {
  const params = new URLSearchParams(query);
  params.set("_ts", String(Date.now()));
  const result = await fetchAppsScript(`${APPS_SCRIPT_URL}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (result.ok) return result.payload;
  throw new Error(
    `${result.error} Confira se o Web App foi implantado como: Executar como Você / Acesso: Qualquer pessoa.`
  );
}

export async function callAppsScriptPOST(body: Record<string, unknown>): Promise<unknown> {
  const form = buildParams(body);

  let result = await fetchAppsScript(APPS_SCRIPT_URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (result.ok) return result.payload;

  result = await fetchAppsScript(APPS_SCRIPT_URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: form.toString(),
  });
  if (result.ok) return result.payload;

  const queryString = form.toString();
  if (queryString.length <= 12_000) {
    result = await fetchAppsScript(`${APPS_SCRIPT_URL}?${queryString}`, { method: "GET", cache: "no-store" });
    if (result.ok) return result.payload;
  } else {
    result = {
      ok: false,
      status: 0,
      error: "Payload grande demais para gravar via GET no Apps Script.",
    };
  }

  throw new Error(
    `${result.error} Confira se o Web App foi implantado corretamente e se APPS_SCRIPT_URL está correta.`
  );
}

export async function uploadImageToImgBB(image: string): Promise<{ url: string; data: unknown }> {
  const raw = String(image || "").trim();
  const base64 = (raw.includes(",") ? raw.split(",").pop() || "" : raw).replace(/\s+/g, "");
  if (!base64) throw new Error("Imagem vazia para upload.");

  const form = new FormData();
  form.append("image", base64);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
    { method: "POST", body: form },
  );
  const text = await response.text();
  let data: { success?: boolean; error?: { message?: string } | string; data?: { url: string } } = {};
  try { data = JSON.parse(text); } catch { /* keep raw */ }
  if (!response.ok || !data.success) {
    const msg = typeof data.error === "string" ? data.error : data.error?.message;
    throw new Error(msg || `Falha no upload ImgBB (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }
  if (!data.data?.url) throw new Error("URL da imagem não retornada.");
  return { url: data.data.url, data };
}
