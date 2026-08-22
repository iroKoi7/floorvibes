import fs from "node:fs";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}

const fileEnv = readEnvFile(".env.local");
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function normalizeSupabaseUrl(value) {
  return value.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

async function checkRestTable(baseUrl, tableName, select = "id", extraQuery = "") {
  const query = new URLSearchParams({ select, limit: "1" });
  const suffix = extraQuery ? `&${extraQuery}` : "";
  const response = await fetch(`${baseUrl}/rest/v1/${tableName}?${query}${suffix}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    body: response.ok ? null : await response.text(),
  };
}

async function main() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    process.exit(1);
  }

  const baseUrl = normalizeSupabaseUrl(supabaseUrl);
  const checks = [
    ["events", "id,slug,is_active", "is_active=eq.true"],
    ["djs", "id,event_id,name,is_active", "is_active=eq.true"],
    ["requests", "id,status,created_at", ""],
    ["dj_timeline_slots", "id,event_id,dj_id,starts_at,ends_at", ""],
  ];

  console.log("FloorVibes connection smoke test");
  console.log("--------------------------------");

  let failed = false;
  for (const [table, select, extraQuery] of checks) {
    try {
      const result = await checkRestTable(baseUrl, table, select, extraQuery);
      if (result.ok) {
        console.log(`OK   ${table}: HTTP ${result.status}`);
      } else {
        failed = true;
        console.log(`FAIL ${table}: HTTP ${result.status}`);
        console.log(result.body?.slice(0, 240));
      }
    } catch (error) {
      failed = true;
      console.log(`FAIL ${table}: ${error.name}: ${error.message}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

await main();
