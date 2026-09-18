// ═══════════════════════════════════════════════════════
//  ɴᴀɪʀᴏɴ x ᴍᴀᴠɪᴀ — Deno Server (KV Powered)
// ═══════════════════════════════════════════════════════

const ADMIN_TOKEN = "NAIRON_ADMIN_SECRET_2026_X9K7"; // ← change this
const DEFAULT_SEARCH_TOKEN = "hsmdz_2026_secure_9xAk!kL";

// Deno KV init
const kv = await Deno.openKv();

// ─── Default keys (first run pe load honge) ───
const DEFAULT_KEYS: Record<string, string> = {
  "Main":        "Main",
  "NAIRON":      "NAIRON",
  "MAVIA":       "MAVIA",
  "api":         "api",
  "token":       "token",
  "maintenance": "off",
};

// ─── Bootstrap KV with defaults ───
async function bootstrap() {
  const initialised = await kv.get(["meta", "initialised"]);
  if (!initialised.value) {
    for (const [k, v] of Object.entries(DEFAULT_KEYS)) {
      await kv.set(["keys", k], v);
    }
    await kv.set(["meta", "maintenance"], false);
    await kv.set(["meta", "search_token"], DEFAULT_SEARCH_TOKEN);
    await kv.set(["meta", "initialised"], true);
    console.log("[BOOTSTRAP] Default keys loaded");
  }
}
await bootstrap();

// ─── CORS ───
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token, X-Admin-Token",
};

// ─── Admin auth check ───
function isAdmin(req: Request): boolean {
  return req.headers.get("X-Admin-Token") === ADMIN_TOKEN;
}

// ─── JSON response helper ───
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════
//  SERVER
// ═══════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // PREFLIGHT
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ═══════════════════════════════════════════════════
  //  ADMIN ROUTES (secret token required)
  // ═══════════════════════════════════════════════════

  // ─── ADD KEY ───
  if (path === "/admin/add-key" && req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    try {
      const body = await req.json();
      const { key, name } = body;
      if (!key || !name) return json({ error: "key and name required" }, 400);
      await kv.set(["keys", key], name);
      return json({ success: true, key, name });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // ─── DELETE KEY ───
  if (path === "/admin/del-key" && req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    try {
      const body = await req.json();
      const { key } = body;
      if (!key) return json({ error: "key required" }, 400);
      await kv.delete(["keys", key]);
      return json({ success: true, key });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // ─── MAINTENANCE ON/OFF ───
  if (path === "/admin/maintenance" && req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    try {
      const body = await req.json();
      const active = !!body.active;
      await kv.set(["meta", "maintenance"], active);
      return json({ success: true, maintenance: active });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // ─── SEARCH TOKEN CHANGE ───
  if (path === "/admin/token" && req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    try {
      const body = await req.json();
      const { token } = body;
      if (!token) return json({ error: "token required" }, 400);
      await kv.set(["meta", "search_token"], token);
      return json({ success: true, token });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // ─── LIST KEYS ───
  if (path === "/admin/list" && req.method === "GET") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    const keys: Record<string, string> = {};
    for await (const entry of kv.list({ prefix: ["keys"] })) {
      keys[entry.key[1] as string] = entry.value as string;
    }
    const maint = await kv.get(["meta", "maintenance"]);
    const tok = await kv.get(["meta", "search_token"]);
    return json({
      success: true,
      keys,
      maintenance: !!maint.value,
      search_token: tok.value,
    });
  }

  // ═══════════════════════════════════════════════════
  //  PROXY SEARCH
  // ═══════════════════════════════════════════════════
  if (path === "/proxy-search") {
    const q = url.searchParams.get("query") || "";
    if (!q) return json({ success: false, error: "query missing" }, 400);

    // Token: header → KV default
    let token = req.headers.get("X-Auth-Token") || "";
    if (!token) {
      const stored = await kv.get(["meta", "search_token"]);
      token = (stored.value as string) || DEFAULT_SEARCH_TOKEN;
    }

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
      return json({ success: false, error: String(e) }, 500);
    }
  }

  // ═══════════════════════════════════════════════════
  //  KEY VERIFY (from KV)
  // ═══════════════════════════════════════════════════
  const key = url.searchParams.get("key");
  if (key !== null && key !== "") {
    const stored = await kv.get(["keys", key]);
    if (!stored.value) return json({ status: "not_verified" });
    return json({
      key,
      name: stored.value as string,
      status: "verified",
    });
  }

  // ═══════════════════════════════════════════════════
  //  MAINTENANCE STATUS (public check)
  // ═══════════════════════════════════════════════════
  if (path === "/maintenance-status") {
    const maint = await kv.get(["meta", "maintenance"]);
    return json({ active: !!maint.value });
  }

  // ═══════════════════════════════════════════════════
  //  INDEX.HTML
  // ═══════════════════════════════════════════════════
  try {
    const html = await Deno.readTextFile(new URL("./index.html", import.meta.url));
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response("index.html missing: " + String(e), { status: 500 });
  }
});

console.log("→ ɴᴀɪʀᴏɴ x ᴍᴀᴠɪᴀ server running");
