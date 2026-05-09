/**
 * Fixup post-import : crée les wallets (avec balance = "Crédits restants") et
 * upload les photos produits depuis Airtable vers Supabase Storage.
 *
 * Usage :
 *   set -a && source .env.local && set +a
 *   AIRTABLE_PAT="patXXX..." node scripts/fixup-feel-by-airtable.mjs
 *
 * Flags : --skip-images, --skip-wallets pour ne faire qu'une partie.
 */

import { createClient } from "@supabase/supabase-js";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!AIRTABLE_PAT || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: AIRTABLE_PAT, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const SKIP_IMAGES = process.argv.includes("--skip-images");
const SKIP_WALLETS = process.argv.includes("--skip-wallets");

const BASE_ID = "appRLQEGcI3VpxqZ7";
const TABLES = {
  snackItems: "tblz03PLKDYu6Dce2",
  clients: "tblNBgPwqGBv36uGd",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn("⚠️ ", ...a);

async function airtableFetchAll(tableId) {
  const all = [];
  let offset = "";
  while (true) {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
    if (!res.ok) throw new Error(`Airtable ${tableId}: ${res.status}`);
    const data = await res.json();
    all.push(...data.records);
    offset = data.offset || "";
    if (!offset) break;
  }
  return all;
}

async function getRestaurantId() {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", "the-feel-by")
    .single();
  if (error) throw new Error(`getRestaurantId: ${error.message}`);
  return data.id;
}

// ============================================
// WALLETS
// ============================================

function fakeEmailFor(rec) {
  const slug = (rec.fields["Prénom + nom"] || rec.id)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "client"}-${rec.id.slice(-6)}@import.the-feel-by.local`;
}

async function fetchAuthUsersByEmail() {
  const map = new Map();
  let page = 1;
  const PER = 1000;
  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < PER) break;
    page += 1;
  }
  return map;
}

async function syncWallets(restaurantId) {
  log("\n=== WALLETS ===");
  const atClients = await airtableFetchAll(TABLES.clients);
  log(`  ${atClients.length} clients Airtable`);

  const usersByEmail = await fetchAuthUsersByEmail();
  log(`  ${usersByEmail.size} auth.users dans Supabase`);

  // Wipe wallets existants pour ce resto (clean state)
  const { error: wipeErr, count: wiped } = await supabase
    .from("wallets")
    .delete({ count: "exact" })
    .eq("restaurant_id", restaurantId);
  if (wipeErr) throw wipeErr;
  log(`  wallets wipés : ${wiped}`);

  const toInsert = [];
  let unmatched = 0;
  for (const rec of atClients) {
    const f = rec.fields;
    let email = (f.Email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) email = fakeEmailFor(rec);

    const userId = usersByEmail.get(email);
    if (!userId) {
      unmatched += 1;
      continue;
    }
    const balanceCents = Math.max(0, Math.round((f["Crédits restants"] || 0) * 100));
    toInsert.push({
      user_id: userId,
      restaurant_id: restaurantId,
      balance: balanceCents,
    });
  }

  log(`  à insérer : ${toInsert.length}  |  emails non retrouvés : ${unmatched}`);

  // Insert par batch
  let inserted = 0;
  const BATCH = 200;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { data, error } = await supabase.from("wallets").insert(batch).select("id");
    if (error) {
      // Fallback : la contrainte UNIQUE (user_id, restaurant_id) existe peut-être en doublon
      warn(`batch ${i}: ${error.message}`);
      for (const row of batch) {
        const { error: e2 } = await supabase
          .from("wallets")
          .upsert(row, { onConflict: "user_id,restaurant_id" });
        if (!e2) inserted += 1;
      }
    } else {
      inserted += data.length;
    }
  }
  log(`  wallets insérés : ${inserted}`);
}

// ============================================
// IMAGES
// ============================================

function inferExtFromContentType(ct) {
  if (!ct) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("png")) return "png";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

async function syncImages(restaurantId) {
  log("\n=== IMAGES PRODUITS ===");
  const atItems = await airtableFetchAll(TABLES.snackItems);
  log(`  ${atItems.length} snack items Airtable`);

  // Récup tous les products du resto via les categories
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", restaurantId);
  const catIds = (cats || []).map((c) => c.id);
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, name, image_url")
    .in("category_id", catIds);
  if (pErr) throw pErr;
  log(`  ${products.length} produits Supabase`);

  // Map normalisé nom → product
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const productByName = new Map();
  for (const p of products) productByName.set(norm(p.name), p);

  let uploaded = 0;
  let missing = 0;
  let unmatched = 0;
  let skipped = 0;
  let i = 0;

  for (const rec of atItems) {
    i += 1;
    const f = rec.fields;
    const itemName = f["Item Name"];
    if (!itemName) continue;
    const prod = productByName.get(norm(itemName));
    if (!prod) {
      unmatched += 1;
      continue;
    }
    const photo = f.Photo?.[0] || f["Photo A"]?.[0];
    if (!photo?.url) {
      missing += 1;
      continue;
    }
    // Si déjà sur notre Storage, skip
    if (prod.image_url && prod.image_url.includes("/product-images/")) {
      skipped += 1;
      continue;
    }
    try {
      const r = await fetch(photo.url);
      if (!r.ok) {
        warn(`download ${itemName}: ${r.status}`);
        continue;
      }
      const ct = r.headers.get("content-type") || photo.type || "image/jpeg";
      const ext = inferExtFromContentType(ct);
      const buf = Buffer.from(await r.arrayBuffer());
      const filePath = `${restaurantId}/${prod.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, buf, { contentType: ct, upsert: true });
      if (upErr) {
        warn(`upload ${itemName}: ${upErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(filePath);
      const newUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("products")
        .update({ image_url: newUrl })
        .eq("id", prod.id);
      if (updErr) {
        warn(`update product ${itemName}: ${updErr.message}`);
        continue;
      }
      uploaded += 1;
      if (uploaded % 20 === 0) log(`    ${uploaded} images uploadées (${i}/${atItems.length})`);
    } catch (e) {
      warn(`exception ${itemName}: ${e.message}`);
    }
  }

  log(
    `  uploadées: ${uploaded}  |  sans photo Airtable: ${missing}  |  sans match produit: ${unmatched}  |  déjà OK: ${skipped}`
  );
}

// ============================================
// MAIN
// ============================================

async function main() {
  log("=== Fixup The Feel By ===");
  const restaurantId = await getRestaurantId();
  log(`Restaurant id : ${restaurantId}`);

  if (!SKIP_WALLETS) await syncWallets(restaurantId);
  if (!SKIP_IMAGES) await syncImages(restaurantId);

  log("\n✅ Done.");
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  console.error(err.stack);
  process.exit(1);
});
