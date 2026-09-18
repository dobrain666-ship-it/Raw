// ═══════════════════════════════════════════════════════
//  ɴᴀɪʀᴏɴ x ᴍᴀᴠɪᴀ — Deno Server
//  Routes:
//    /              → index.html serve
//    /?key=XXX      → key verify
//    /proxy-search  → proxy for db-service-pk.vercel.app
// ═══════════════════════════════════════════════════════

const DEFAULT_TOKEN = "hsmdz_2026_secure_9xAk!kL";

// ─── KEYS SYSTEM ───
// Ye keys browser se verify hongi. Value = name (verified response mein name).
const KEYS: Record<string, string> = {
  "Main":        "Main",
  "NAIRON":      "NAIRON",
  "MAVIA":       "MAVIA",
  "api":         "hsmdz_2026_secure_9xAk!kL",   // api key → name = API token
  "token":       "hsmdz_2026_secure_9xAk!kL",   // token key → name = token value
  "maintenance": "deactive",                       // maintenance → name = "active"
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ─── PREFLIGHT ───
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ═══════════════════════════════════════════════════════
  //  ROUTE 1: /proxy-search  →  proxy to search API
  // ═══════════════════════════════════════════════════════
  if (url.pathname === "/proxy-search") {
    const q = url.searchParams.get("query") || "";
    if (!q) {
      return new Response(JSON.stringify({ success: false, error: "query missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Token: X-Auth-Token → Authorization → default
    let token = req.headers.get("X-Auth-Token") || "";
    if (!token) {
      const auth = req.headers.get("Authorization") || "";
      token = auth.replace(/^Bearer\s+/i, "").trim();
    }
    if (!token) token = DEFAULT_TOKEN;

    try {
      const upstream = await fetch(
        `https://db-service-pk.vercel.app/api/search?query=${encodeURIComponent(q)}`,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: String(e) }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROUTE 2: /  →  key verify OR index.html
  // ═══════════════════════════════════════════════════════
  const key = url.searchParams.get("key");

  // Agar key param hai → verify karo
  if (key !== null) {
    const name = KEYS[key];
    if (!name) {
      return new Response(JSON.stringify({ status: "not_verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        key: key,
        name: name,
        status: "verified",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Nahi toh index.html serve karo
  try {
    const html = await Deno.readTextFile(new URL("./index.html", import.meta.url));
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response("index.html not found: " + String(e), {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
});

console.log("→ Server running");
