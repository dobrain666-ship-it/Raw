// ═══════════════════════════════════════════════════════
//  CORS Bypass Proxy
//  Usage: https://your-deno.deno.net/?query=03001234567
// ═══════════════════════════════════════════════════════

const SEARCH_API = "https://db-service-pk.vercel.app/api/search";
const DEFAULT_TOKEN = "hsmdz_2026_secure_9xAk!kL";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Query param
  const query = url.searchParams.get("query") || "";

  if (!query) {
    return new Response(
      JSON.stringify({ success: false, error: "query missing" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  // Token: header → default
  const token = req.headers.get("X-Auth-Token") || DEFAULT_TOKEN;

  try {
    const upstream = await fetch(
      `${SEARCH_API}?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});

console.log("→ CORS proxy running");
