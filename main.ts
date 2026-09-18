// Deno server mein
if (url.pathname === "/proxy-search") {
  const q = url.searchParams.get("query");
  const token = req.headers.get("X-Auth-Token") || "";
  const upstream = await fetch(
    `https://db-service-pk.vercel.app/api/search?query=${encodeURIComponent(q)}`,
    { headers: { "Authorization": "Bearer " + token } }
  );
  const body = await upstream.text();
  return new Response(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
}
