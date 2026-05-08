/**
 * Import historique The Feel By depuis Airtable vers Supabase.
 *
 * Source : base Airtable appRLQEGcI3VpxqZ7
 *   - Catégories       (tblGSW0VSZOVKu2i7)
 *   - Snack Items      (tblz03PLKDYu6Dce2)
 *   - Clients          (tblNBgPwqGBv36uGd)
 *   - Commandes        (tbl9pFAGNgmKjPK2j)
 *   - Articles cmd.    (tbl3JxUDPqzcpM1bZ) — table de jointure pour les items des commandes
 *
 * Cible Supabase : restaurants.slug = "the-feel-by".
 *
 * Stratégie : wipe + reimport complet pour CE restaurant uniquement.
 *
 * Usage :
 *   set -a && source .env.local && set +a
 *   AIRTABLE_PAT="patXXX..." node scripts/import-feel-by-airtable.mjs --dry-run
 *   AIRTABLE_PAT="patXXX..." node scripts/import-feel-by-airtable.mjs
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!AIRTABLE_PAT) {
  console.error("ERROR: AIRTABLE_PAT env var is required");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required"
  );
  process.exit(1);
}

const BASE_ID = "appRLQEGcI3VpxqZ7";
const TABLES = {
  categories: "tblGSW0VSZOVKu2i7",
  snackItems: "tblz03PLKDYu6Dce2",
  clients: "tblNBgPwqGBv36uGd",
  commandes: "tbl9pFAGNgmKjPK2j",
  articles: "tbl3JxUDPqzcpM1bZ",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...args) => console.log(...args);
const warn = (...args) => console.warn("⚠️ ", ...args);

// ============================================
// AIRTABLE FETCH (paginated)
// ============================================

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
    if (!res.ok) {
      throw new Error(`Airtable fetch ${tableId} failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    all.push(...data.records);
    offset = data.offset || "";
    if (!offset) break;
  }
  return all;
}

// ============================================
// SUPABASE HELPERS
// ============================================

async function getRestaurantId() {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", "the-feel-by")
    .single();
  if (error) {
    throw new Error(`Restaurant 'the-feel-by' introuvable : ${error.message}`);
  }
  return data.id;
}

async function wipe(restaurantId) {
  log("\n=== WIPE EXISTANT ===");

  // 1) Snapshot des customer_user_id qui ont des orders sur ce resto
  const { data: prevOrderUsers, error: errPrev } = await supabase
    .from("orders")
    .select("customer_user_id")
    .eq("restaurant_id", restaurantId)
    .not("customer_user_id", "is", null);
  if (errPrev) throw errPrev;
  const customerIdsToCheck = [...new Set((prevOrderUsers || []).map((r) => r.customer_user_id))];

  // 2) Wallet transactions liées aux orders du resto (pour éviter blocage FK orders)
  const { data: ordersToDelete } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId);
  const orderIds = (ordersToDelete || []).map((o) => o.id);
  if (orderIds.length) {
    const { error: errWtx } = await supabase
      .from("wallet_transactions")
      .delete()
      .in("order_id", orderIds);
    if (errWtx) warn(`wallet_transactions delete: ${errWtx.message}`);
  }

  // 3) Orders
  const { error: errOrders, count: cOrders } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .eq("restaurant_id", restaurantId);
  if (errOrders) throw errOrders;
  log(`  orders supprimées : ${cOrders}`);

  // 4) Products via catégories
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", restaurantId);
  const catIds = (cats || []).map((c) => c.id);
  if (catIds.length) {
    const { error: errProd, count: cProd } = await supabase
      .from("products")
      .delete({ count: "exact" })
      .in("category_id", catIds);
    if (errProd) throw errProd;
    log(`  products supprimés : ${cProd}`);
  }

  // 5) Categories
  const { error: errCats, count: cCats } = await supabase
    .from("categories")
    .delete({ count: "exact" })
    .eq("restaurant_id", restaurantId);
  if (errCats) throw errCats;
  log(`  categories supprimées : ${cCats}`);

  // 6) Anciens auth.users qui n'ont plus de commandes nulle part (purge "orpheline")
  let purged = 0;
  for (const userId of customerIdsToCheck) {
    if (!userId) continue;
    const { count: stillUsed } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_user_id", userId);
    if ((stillUsed || 0) > 0) continue;
    // pas d'autres orders → on supprime customer_profiles + auth.user
    await supabase.from("customer_profiles").delete().eq("user_id", userId);
    const { error: errDelUser } = await supabase.auth.admin.deleteUser(userId);
    if (!errDelUser) purged += 1;
  }
  log(`  auth.users orphelins supprimés : ${purged}`);
}

// ============================================
// IMPORT CATEGORIES
// ============================================

const FALLBACK_CATEGORY_KEY = "__autres__";

async function importCategories(restaurantId, atRecords) {
  log("\n=== CATEGORIES ===");
  const sorted = [...atRecords].sort((a, b) => {
    const oa = a.fields["Ordre d'affichage"] ?? 999;
    const ob = b.fields["Ordre d'affichage"] ?? 999;
    if (oa !== ob) return oa - ob;
    return (a.fields.Name || "").localeCompare(b.fields.Name || "");
  });

  const toInsert = sorted.map((rec, idx) => ({
    name: rec.fields.Name || "(sans nom)",
    restaurant_id: restaurantId,
    sort_order: rec.fields["Ordre d'affichage"] ?? idx + 1,
    is_visible: rec.fields["Afficher sur le menu d'accueil app"] !== false,
  }));
  // Fallback "Autres" pour les items Airtable sans catégorie
  toInsert.push({
    name: "Autres",
    restaurant_id: restaurantId,
    sort_order: 999,
    is_visible: false,
  });

  if (DRY_RUN) {
    log(`  [dry-run] ${toInsert.length} catégories à insérer (dont fallback 'Autres')`);
    const map = new Map(sorted.map((rec) => [rec.id, "DRY_" + rec.id]));
    map.set(FALLBACK_CATEGORY_KEY, "DRY_AUTRES");
    return map;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert(toInsert)
    .select("id, name");
  if (error) throw new Error(`insert categories: ${error.message}`);

  const map = new Map();
  sorted.forEach((rec, idx) => map.set(rec.id, data[idx].id));
  map.set(FALLBACK_CATEGORY_KEY, data[data.length - 1].id);
  log(`  catégories insérées : ${data.length} (dont fallback 'Autres')`);
  return map;
}

// ============================================
// IMPORT PRODUCTS
// ============================================

async function importProducts(atRecords, categoryMap) {
  log("\n=== PRODUCTS ===");
  const sortByCat = {};
  const toInsert = [];
  const orderedAtRecs = [];

  // tri stable par catégorie + nom pour sort_order intra-cat
  const sorted = [...atRecords].sort((a, b) => {
    const ca = a.fields["Catégorie"]?.[0] || "";
    const cb = b.fields["Catégorie"]?.[0] || "";
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.fields["Item Name"] || "").localeCompare(b.fields["Item Name"] || "");
  });

  for (const rec of sorted) {
    const f = rec.fields;
    const catAtId = f["Catégorie"]?.[0];
    let categoryId = catAtId ? categoryMap.get(catAtId) : null;
    let bucketKey = catAtId;
    if (!categoryId) {
      categoryId = categoryMap.get(FALLBACK_CATEGORY_KEY);
      bucketKey = FALLBACK_CATEGORY_KEY;
    }
    if (!f["Item Name"]) {
      // Skip seulement si l'item lui-même n'a pas de nom (record vide)
      continue;
    }
    sortByCat[bucketKey] = (sortByCat[bucketKey] || 0) + 1;
    const priceEuros = typeof f.Price === "number" ? f.Price : 0;
    const priceCents = Math.round(priceEuros * 100);
    const photo = f.Photo?.[0]?.url || f["Photo A"]?.[0]?.url || null;
    toInsert.push({
      name: f["Item Name"],
      description: f.Description || null,
      price: priceCents,
      category_id: categoryId,
      image_url: photo,
      is_available: f["Disponibilité"] !== "Rupture de stock",
      sort_order: sortByCat[bucketKey],
    });
    orderedAtRecs.push(rec);
  }

  if (DRY_RUN) {
    log(`  [dry-run] ${toInsert.length} produits à insérer`);
    return new Map(orderedAtRecs.map((rec) => [rec.id, { id: "DRY_" + rec.id, name: rec.fields["Item Name"], price: Math.round((rec.fields.Price ?? 0) * 100) }]));
  }

  // Insert par batch de 200 pour rester dans les limites
  const map = new Map();
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const recs = orderedAtRecs.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("products")
      .insert(batch)
      .select("id, name, price");
    if (error) throw new Error(`insert products batch ${i}: ${error.message}`);
    data.forEach((row, idx) => {
      map.set(recs[idx].id, { id: row.id, name: row.name, price: row.price });
    });
    inserted += data.length;
  }
  log(`  produits insérés : ${inserted}`);
  return map;
}

// ============================================
// IMPORT CUSTOMERS (auth.users + customer_profiles)
// ============================================

function randomPassword() {
  return (
    "TFB!" +
    Array.from({ length: 24 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("")
  );
}

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

async function fetchAllAuthUsers() {
  const byEmail = new Map();
  const PER_PAGE = 1000;
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    }
    if (data.users.length < PER_PAGE) break;
    page += 1;
  }
  return byEmail;
}

async function importCustomers(atRecords) {
  log("\n=== CLIENTS ===");
  const map = new Map();
  let created = 0;
  let reused = 0;
  let failed = 0;

  if (DRY_RUN) {
    for (const rec of atRecords) {
      const fullName = (rec.fields["Prénom + nom"] || "Client").trim();
      map.set(rec.id, { user_id: "DRY_" + rec.id, full_name: fullName });
    }
    log(`  [dry-run] ${atRecords.length} clients à créer`);
    return map;
  }

  log("  pré-chargement des auth.users existants...");
  const existingUsers = await fetchAllAuthUsers();
  log(`  ${existingUsers.size} users déjà présents dans Supabase`);

  for (const rec of atRecords) {
    const f = rec.fields;
    const fullName =
      (f["Prénom + nom"] || `${f["Prénom"] || ""} ${f["Nom"] || ""}`).trim() || "Client";
    let email = (f.Email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      email = fakeEmailFor(rec);
    }

    let userId = existingUsers.get(email);

    if (userId) {
      reused += 1;
    } else {
      const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { full_name: fullName, imported_from: "airtable_thefeelby" },
      });
      if (createErr) {
        warn(`createUser ${fullName} <${email}>: ${createErr.message}`);
        failed += 1;
        continue;
      }
      userId = createRes.user.id;
      existingUsers.set(email, userId);
      created += 1;
    }

    const { error: errProf } = await supabase
      .from("customer_profiles")
      .upsert(
        { user_id: userId, full_name: fullName, phone: null },
        { onConflict: "user_id" }
      );
    if (errProf) warn(`customer_profile upsert ${email}: ${errProf.message}`);

    map.set(rec.id, { user_id: userId, full_name: fullName, email });
  }

  log(`  créés : ${created}  |  réutilisés : ${reused}  |  échoués : ${failed}`);
  return map;
}

// ============================================
// IMPORT ORDERS
// ============================================

function mapOrderStatus(at) {
  switch (at) {
    case "Commande à faire":
      return "new";
    case "Commande prête":
      return "ready";
    case "Commande récupérée par le client":
      return "done";
    default:
      return "done";
  }
}

async function importOrders(restaurantId, atOrders, atArticles, productMap, customerMap) {
  log("\n=== COMMANDES ===");

  const articleById = new Map(atArticles.map((r) => [r.id, r]));

  // Normalisation : minuscules, accents retirés, espaces collapsés
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // Index produits trié par longueur décroissante pour matching par préfixe
  const productsNormalized = [];
  for (const [, p] of productMap) {
    productsNormalized.push({ key: norm(p.name), prod: p });
  }
  productsNormalized.sort((a, b) => b.key.length - a.key.length);

  function matchProductByText(rawText) {
    const n = norm(rawText);
    if (!n) return null;
    // Match exact d'abord
    for (const { key, prod } of productsNormalized) {
      if (key === n) return prod;
    }
    // Sinon préfixe (article + sauce/option)
    for (const { key, prod } of productsNormalized) {
      if (n.startsWith(key + " ") || n === key) return prod;
    }
    return null;
  }

  let lineitemMissingProduct = 0;
  let totalMismatch = 0;
  const toInsert = [];

  for (const rec of atOrders) {
    const f = rec.fields;
    const articleIds = f["Articles commandés"] || [];
    const consoIds = f["Consommations"] || [];
    const items = [];
    let computedTotalCents = 0;

    // 1) Items via "Articles commandés" (table de jointure)
    for (const aid of articleIds) {
      const art = articleById.get(aid);
      if (!art) continue;
      const af = art.fields;
      const dynLink = af["Article (dynamic)"]?.[0];
      let prod = dynLink ? productMap.get(dynLink) : null;
      if (!prod) prod = matchProductByText(af.Article);
      const unitPriceCents = Math.round((af["Montant article"] || 0) * 100);
      if (!prod) {
        lineitemMissingProduct += 1;
        items.push({
          product_id: null,
          product_name: (af.Article || "Article inconnu").trim() || "Article",
          quantity: 1,
          unit_price: unitPriceCents,
          modifiers: [],
          line_total: unitPriceCents,
        });
      } else {
        items.push({
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: unitPriceCents || prod.price,
          modifiers: [],
          line_total: unitPriceCents || prod.price,
        });
      }
      computedTotalCents += unitPriceCents;
    }

    // 2) Fallback : "Consommations" (lien direct vers Snack Items, anciennes commandes sans table de jointure)
    if (items.length === 0 && consoIds.length > 0) {
      for (const sid of consoIds) {
        const prod = productMap.get(sid);
        if (!prod) {
          items.push({
            product_id: null,
            product_name: "Article inconnu",
            quantity: 1,
            unit_price: 0,
            modifiers: [],
            line_total: 0,
          });
          continue;
        }
        items.push({
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: prod.price,
          modifiers: [],
          line_total: prod.price,
        });
        computedTotalCents += prod.price;
      }
    }

    const declaredTotalCents = Math.round((f["Total de la commande"] || 0) * 100);
    const totalCents = declaredTotalCents > 0 ? declaredTotalCents : computedTotalCents;
    if (declaredTotalCents > 0 && Math.abs(declaredTotalCents - computedTotalCents) > 5) {
      totalMismatch += 1;
    }

    const clientAtId = f["Clients"]?.[0];
    const customer = clientAtId ? customerMap.get(clientAtId) : null;

    // customer_info : nom à partir de "Client" texte, fallback "Prénom (from Clients)"
    const customerName =
      f["Client"] ||
      (customer ? customer.full_name : null) ||
      (f["Prénom (from Clients)"]?.[0]) ||
      "Client";

    const order = {
      restaurant_id: restaurantId,
      customer_info: {
        name: customerName,
        email: f["Mail client"] || (customer && customer.email) || null,
        notes: f["Commentaire commande"] || null,
        bipper: f["Numéro de bipper"] || null,
        secret_code: f["Code secret commande"] ?? null,
        airtable_order_id: f["ID commande"] ?? null,
      },
      items,
      status: mapOrderStatus(f["Statut commande"]),
      total_price: totalCents,
      payment_method: "on_site",
      payment_source: "direct",
      order_type: "takeaway",
      paid: f["Récupérée par le client"] === true,
      customer_user_id: customer ? customer.user_id : null,
      created_at: f["Date et heure de la commande"] || rec.createdTime,
      updated_at: f["Date de récupération client"] || f["Date et heure de la commande"] || rec.createdTime,
    };
    toInsert.push(order);
  }

  log(`  préparées : ${toInsert.length}`);
  if (lineitemMissingProduct) warn(`  line items sans match produit : ${lineitemMissingProduct}`);
  if (totalMismatch) warn(`  écarts total > 5 cts (declaré vs calculé) : ${totalMismatch}`);

  if (DRY_RUN) {
    log("  [dry-run] sample première commande :");
    console.dir(toInsert[0], { depth: 5 });
    return;
  }

  const BATCH = 250;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { data, error } = await supabase.from("orders").insert(batch).select("id");
    if (error) throw new Error(`insert orders batch ${i}: ${error.message}`);
    inserted += data.length;
    if ((i / BATCH) % 4 === 0) log(`    ... ${inserted}/${toInsert.length}`);
  }
  log(`  commandes insérées : ${inserted}`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  log(`=== Import Airtable → Supabase (${DRY_RUN ? "DRY RUN" : "LIVE"}) ===`);

  const restaurantId = await getRestaurantId();
  log(`Restaurant id : ${restaurantId}`);

  log("\nFetching Airtable...");
  const [atCats, atItems, atClients, atCmd, atArt] = await Promise.all([
    airtableFetchAll(TABLES.categories),
    airtableFetchAll(TABLES.snackItems),
    airtableFetchAll(TABLES.clients),
    airtableFetchAll(TABLES.commandes),
    airtableFetchAll(TABLES.articles),
  ]);
  log(
    `  catégories: ${atCats.length}, items: ${atItems.length}, clients: ${atClients.length}, commandes: ${atCmd.length}, articles: ${atArt.length}`
  );

  if (!DRY_RUN) await wipe(restaurantId);

  const categoryMap = await importCategories(restaurantId, atCats);
  const productMap = await importProducts(atItems, categoryMap);
  const customerMap = await importCustomers(atClients);
  await importOrders(restaurantId, atCmd, atArt, productMap, customerMap);

  log("\n✅ Done.");
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  console.error(err.stack);
  process.exit(1);
});
