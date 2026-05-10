/**
 * Imports category illustrations from the legacy Airtable base into Supabase
 * for the restaurant "The Feel By".
 *
 * Pulls every record from the Catégories table, finds the first attachment
 * field on each (Photo / Image / Illustration / Icone), uploads the image to
 * the product-images bucket under {restaurantId}/categories/{categoryId}.{ext}
 * and writes the public URL onto categories.image_url.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   AIRTABLE_PAT="patXXX..." node scripts/import-feel-by-category-images.mjs
 *   AIRTABLE_PAT="patXXX..." node scripts/import-feel-by-category-images.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!AIRTABLE_PAT || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERROR: AIRTABLE_PAT, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY required",
  );
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const BASE_ID = "appRLQEGcI3VpxqZ7";
const CATEGORIES_TABLE = "tblGSW0VSZOVKu2i7";
const RESTAURANT_SLUG = "the-feel-by";

const ATTACHMENT_FIELD_CANDIDATES = [
  "Photo",
  "Photo catégorie",
  "Image",
  "Image catégorie",
  "Illustration",
  "Icone",
  "Icône",
  "Visuel",
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn("⚠️ ", ...a);

const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function airtableFetchAll(tableId) {
  const all = [];
  let offset = "";
  while (true) {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });
    if (!res.ok) throw new Error(`Airtable ${tableId}: ${res.status} ${res.statusText}`);
    const data = await res.json();
    all.push(...data.records);
    offset = data.offset || "";
    if (!offset) break;
  }
  return all;
}

function pickAttachment(fields) {
  for (const key of ATTACHMENT_FIELD_CANDIDATES) {
    const value = fields[key];
    if (Array.isArray(value) && value[0]?.url) {
      return { key, attachment: value[0] };
    }
  }
  // Fallback: any field that looks like an attachment array.
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value) && value[0]?.url && value[0]?.type) {
      return { key, attachment: value[0] };
    }
  }
  return null;
}

function inferExt(contentType, mimeFallback) {
  const ct = (contentType || mimeFallback || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("svg")) return "svg";
  return "jpg";
}

async function getRestaurant() {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", RESTAURANT_SLUG)
    .single();
  if (error) throw new Error(`getRestaurant: ${error.message}`);
  return data;
}

async function getCategoriesByName(restaurantId) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, image_url")
    .eq("restaurant_id", restaurantId);
  if (error) throw new Error(`getCategories: ${error.message}`);
  const map = new Map();
  for (const cat of data) map.set(norm(cat.name), cat);
  return { rows: data, byName: map };
}

async function main() {
  log(`Mode: ${DRY_RUN ? "DRY-RUN" : "LIVE"}${FORCE ? " (force overwrite)" : ""}`);
  const restaurant = await getRestaurant();
  log(`Restaurant: ${restaurant.name} (${restaurant.id})`);

  const { rows: supaCats, byName: supaByName } = await getCategoriesByName(
    restaurant.id,
  );
  log(`Supabase categories: ${supaCats.length}`);

  const atRecords = await airtableFetchAll(CATEGORIES_TABLE);
  log(`Airtable categories: ${atRecords.length}`);

  let matched = 0;
  let uploaded = 0;
  let skippedExisting = 0;
  let skippedNoAttachment = 0;
  let unmatched = 0;
  const sampleFields = atRecords[0]?.fields ? Object.keys(atRecords[0].fields) : [];
  log(`Field names on first record: ${sampleFields.join(", ") || "(none)"}`);

  for (const rec of atRecords) {
    const f = rec.fields;
    const atName = f.Name || f["Nom"] || f["Catégorie"] || "";
    if (!atName) {
      warn(`record ${rec.id}: no name field`);
      continue;
    }
    const supaCat = supaByName.get(norm(atName));
    if (!supaCat) {
      unmatched += 1;
      log(`  · "${atName}" → no Supabase match`);
      continue;
    }
    matched += 1;

    if (
      !FORCE &&
      supaCat.image_url &&
      supaCat.image_url.includes("/product-images/")
    ) {
      skippedExisting += 1;
      log(`  · "${atName}" → already has Supabase image, skipping`);
      continue;
    }

    const picked = pickAttachment(f);
    if (!picked) {
      skippedNoAttachment += 1;
      log(`  · "${atName}" → no attachment field`);
      continue;
    }

    const { attachment } = picked;
    if (DRY_RUN) {
      log(
        `  · "${atName}" → would upload ${attachment.url.slice(0, 80)}… (${attachment.type || "?"})`,
      );
      uploaded += 1;
      continue;
    }

    try {
      const r = await fetch(attachment.url);
      if (!r.ok) {
        warn(`  download "${atName}": ${r.status}`);
        continue;
      }
      const ct = r.headers.get("content-type") || attachment.type || "image/jpeg";
      const ext = inferExt(ct, attachment.type);
      const buf = Buffer.from(await r.arrayBuffer());
      const filePath = `${restaurant.id}/categories/${supaCat.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, buf, { contentType: ct, upsert: true });
      if (upErr) {
        warn(`  upload "${atName}": ${upErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);
      const newUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: updErr } = await supabase
        .from("categories")
        .update({ image_url: newUrl })
        .eq("id", supaCat.id);
      if (updErr) {
        warn(`  update "${atName}": ${updErr.message}`);
        continue;
      }
      uploaded += 1;
      log(`  · "${atName}" → uploaded (${ext})`);
    } catch (err) {
      warn(`  "${atName}": ${err.message}`);
    }
  }

  log("");
  log("=== Résumé ===");
  log(`  matched (name → name)   : ${matched} / ${atRecords.length}`);
  log(`  uploaded                : ${uploaded}`);
  log(`  skipped (already there) : ${skippedExisting}`);
  log(`  skipped (no attachment) : ${skippedNoAttachment}`);
  log(`  Airtable not in Supabase: ${unmatched}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
