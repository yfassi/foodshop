import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://modisknrblsddpmzmhja.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// 1. RESTAURANT
// ============================================

async function getOrCreateRestaurant() {
  const slug = "the-feel-by";

  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    console.log(`Restaurant "The Feel By" already exists (id: ${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: "The Feel By",
      slug,
      description: "Burgers, tacos, bowls, sandwichs et desserts faits maison.",
      is_accepting_orders: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create restaurant: ${error.message}`);
  console.log(`Created restaurant "The Feel By" (id: ${data.id})`);
  return data.id;
}

// ============================================
// 2. CATEGORIES
// ============================================

// Map CSV category names to clean names + Lucide icons
const CATEGORY_MAP = {
  "⭐️ Nouveautés": { name: "Nouveautés", icon: "sparkles" },
  "🍔 Burger": { name: "Burgers", icon: "hamburger" },
  "🥤Menu": { name: "Menus", icon: "hand-platter" },
  "🌯 French Tacos": { name: "French Tacos", icon: "beef" },
  "🥤 Boisson": { name: "Boissons", icon: "cup-soda" },
  "🍨 Dessert": { name: "Desserts", icon: "cake" },
  "🍲 Bowl": { name: "Bowls", icon: "soup" },
  "🥪 Sandwich": { name: "Sandwichs", icon: "sandwich" },
  "🫓 Cheese Naan": { name: "Cheese Naan", icon: "wheat" },
  "🥗 Salade": { name: "Salades", icon: "salad" },
  "🍟 Frites": { name: "Frites", icon: "popcorn" },
  Panini: { name: "Paninis", icon: "sandwich" },
  // New categories for uncategorized items
  "🍝 Pâtes": { name: "Pâtes", icon: "wheat" },
  "🍗 Snacks": { name: "Snacks", icon: "drumstick" },
};

// Category sort order
const CATEGORY_ORDER = [
  "Nouveautés",
  "Burgers",
  "Menus",
  "French Tacos",
  "Bowls",
  "Sandwichs",
  "Paninis",
  "Cheese Naan",
  "Pâtes",
  "Salades",
  "Frites",
  "Snacks",
  "Boissons",
  "Desserts",
];

// For items with empty category, infer one
function inferCategory(itemName) {
  const name = itemName.toLowerCase();
  if (name.includes("pâtes") || name.includes("pates")) return "🍝 Pâtes";
  if (name.includes("menu ")) return "🥤Menu";
  if (name.includes("panini") || name === "🇮🇹 l'italien") return "Panini";
  if (
    name.includes("frites") ||
    name.includes("frite")
  )
    return "🍟 Frites";
  if (
    name.includes("savoyard") ||
    name.includes("double")
  )
    return "🍔 Burger";
  if (name.includes("crousty")) return "🍲 Bowl";
  // Snacks: tenders, wings, sticks, oignon rings, jalapeños
  return "🍗 Snacks";
}

async function createCategories(restaurantId) {
  // First delete existing categories for this restaurant (clean slate)
  const { error: delError } = await supabase
    .from("categories")
    .delete()
    .eq("restaurant_id", restaurantId);
  if (delError)
    console.warn(`Warning deleting old categories: ${delError.message}`);

  const categoriesToInsert = CATEGORY_ORDER.map((name, idx) => {
    const entry = Object.values(CATEGORY_MAP).find((v) => v.name === name);
    return {
      name: entry.name,
      icon: entry.icon,
      restaurant_id: restaurantId,
      sort_order: idx + 1,
      is_visible: true,
    };
  });

  const { data, error } = await supabase
    .from("categories")
    .insert(categoriesToInsert)
    .select("id, name");

  if (error) throw new Error(`Failed to create categories: ${error.message}`);

  console.log(`Created ${data.length} categories`);

  // Return a map of name -> id
  const map = {};
  for (const cat of data) {
    map[cat.name] = cat.id;
  }
  return map;
}

// ============================================
// 3. PARSE CSV & INSERT PRODUCTS
// ============================================

const CSV_DATA = `Pâtes Bolognaise,⭐️ Nouveautés,"Sauce tomate, Viande hachée",5.00
Burger Classico ,🍔 Burger,"Steak, salade, oignons rouges, cheddar, sauce au choix",5.00
Le Cheesy,🥤Menu,"Burger Tenders, Sauce Cheddar",7.90
Le Fish ,🍔 Burger,"Poisson pané, salade, tomate,cheddar, sauce.",5.00
Burger Le Crunchy ,🍔 Burger,"Tenders, salade, oignons rouges, cheddar ",5.00
Tacos Le Jefe,🌯 French Tacos,", Tenders, Cheddar, Sauce Salsa, Poivrons, Jalapenos",5.90
Le Jefe,⭐️ Nouveautés,"Tenders, Cheddar, Sauce Salsa, Poivrons, Jalapenos",7.90
Burger Rings ,🍔 Burger,"Tenders, Oignon rings, salade, tomates",6.00
Burger Le Mexico,⭐️ Nouveautés,"Tenders, Cheddar, Sauce Salsa, Poivrons, Jalapenos",5.90
Boisson 33cl ,🥤 Boisson,Différentes saveurs au choix disponibles au comptoir,1.10
Red bull,🥤 Boisson,Différentes saveurs au choix disponibles au comptoir,2.20
Cookie,🍨 Dessert,,2.00
Beignet chocolat XL,🍨 Dessert,,2.00
Fondant ,🍨 Dessert,,2.00
Churros,🍨 Dessert,Nappage nutella,3.00
Crêpe,🍨 Dessert,Nutella,2.00
Gauffre Nutella,🍨 Dessert,Gauffre nappage Nutella,3.00
Panini nutella,🍨 Dessert,Panini au nutella,3.00
Compote,🍨 Dessert,,0.90
La Box,🥤Menu,"Burger Tenders, Mini Classic, Frites, Boisson",8.50
Cappuccino,🍨 Dessert,Café Cappuccino,1.10
Burger Le Mexico,🍔 Burger,"Tenders, Cheddar, Sauce Salsa, Poivrons, Jalapenos",5.90
Cafe Latte,🍨 Dessert,Cafe avec mousse de lait,1.50
Veritable Lait Chocolat,🍨 Dessert,Chocolat chaud,1.50
Beignet Dubaï,🍨 Dessert,Beignet fourré au chocolat de dubai,2.50
Yaourt aux fruits,🍨 Dessert,,0.90
Menu Le Fish,🥤Menu,Le Fish + Frites + Boisson,7.00
Crousty Feel,🍲 Bowl,"Tenders, Riz, sauce fromagère, oignons frits, sauce salée sucrée, persil",7.50
Menu Cheese Naan,🥤Menu,Cheese Naan + frites + Boisson,7.50
Menu M,🥤Menu,"Cheeseburger, petite frites, Capri Sun",5.00
Menu S,🥤Menu,Cheese tenders + petite frites + Capri Sun,5.00
Menu XL Classico,🥤Menu,Burger Classico + Frites sauce fromagère oignon crispy + boisson,7.00
Menu XL Crunchy,🥤Menu,Burger Crunchy + Frites sauce fromagère oignon crispy + Boisson,7.00
Menu XL le Rings,🥤Menu,Burger Le Rings Crunchy + Frites sauce fromagère oignon crispy + Boisson,7.90
Tacos,🌯 French Tacos,"Viande au choix, frites, sauce fromagère…",6.00
Feel Nature,🍲 Bowl,"Frites, viande au choix, sauce fromagère",5.50
Crousty Feel,🍲 Bowl,"Tenders, Riz, sauce fromagère, oignons frits, sauce salée sucrée, persil",7.50
La Box,🍲 Bowl,"Assortiment dans un bowl de sticks mozzarella, jalapeños, falafel, oignons rings, frite et sauce fromagère",5.90
Panini Fromage,🥪 Sandwich,"Gruyere, mozzarella, sauce gruyère.",4.00
Sandwich L'Américain,🥪 Sandwich,"Baguette, steak, crudités, fromage, frites, sauce fromagère",5.90
Sandwich Le DZ,🥪 Sandwich,"Poulet mariné, poivronade, salades, sauce",4.00
Le Kentucky,🥪 Sandwich,"Baguette, Tenders, oignon frit, crudités, frites, sauce fromagère",5.90
Sandwich Le Natural,🥪 Sandwich,"Crudités, poulet grillé",4.00
Naan Classico,🫓 Cheese Naan,"Viande au choix, crudités, sauce fromagère",5.00
Naan Le Vegi,🫓 Cheese Naan,"Galette de pomme de terre frit, falafel, salades, tomates, oignon, poivronnade",5.00
Salade chèvre chaud,🥗 Salade,"Chèvre chaud sur pain toaster, salade, tomates, sauce.",4.50
Salade Cesar Feel,🥗 Salade,"Crudités, poulet, parmesan, croûtons",4.50
Frites Sauce Fromagère,🍟 Frites,Portion de frites sauce fromagère,2.50
Jalapeños frits X4,,,3.00
La Crunchy Box,🥤Menu,"Burger Tenders, Frites, Nuggets, Boisson",8.50
Panini Kebab,,"Kebab, sauce fromagère.",4.00
L'Italien,,"Tomates, Pesto, mozzarella",4.00
Panini Classico,Panini,"Steak, cheddar, sauce burger",4.00
Tenders x4,,4 tenders sauce au choix,6.00
Stick Mozza X7,,7 Sticks mozzarella frits accompagnés de sauce fromagère,5.00
Oignon Rings x7,,Beignets d'oignons accompagnés de sauce fromagère,5.00
Le Savoyard,,"Steak, fromage à raclette, bacon de dinde, pain buns, salade, oignon crispy, sauce",6.00
L'Amigos,⭐️ Nouveautés,"Tenders, Cheddar, Sauce Salsa, Poivrons, Jalapenos, Salade",5.90
Cheese Naan L'Amigos,⭐️ Nouveautés,"Tenders, Cheddar, Sauce Salsa, Poivrons, Jalapenos, Salade",7.90
Le Double,,"Double steak, salade, oignon crispy, double cheddar, sauce.",6.50
Menu Savoyard,,Burger Savoyard + Frites + Boisson,7.90
Menu Le Double,,Burger Double + Frites + Boisson,7.90
Crousty Feel,,"Tenders, Riz, sauce fromagère, oignon frits, sauce salée sucrée, persil",7.50
Wings X6,,6x wings,6.50
Pâtes Forestière,,"Pâtes, poulet, champignons, sauce fromagère",5.00
Pâtes Carbonara,,"Pâtes, lardinette de dinde, sauce fromagère",5.00
Pâtes Pesto,,"Pâtes, pesto, poulet",5.00
Pâtes sauce fromagère avec viande au choix,,"Pâtes, viande au choix, sauce fromagère",5.00
Frites nature,,,2.00`;

function parseProducts() {
  const lines = CSV_DATA.trim().split("\n");
  const products = [];

  for (const line of lines) {
    // Parse CSV line handling quoted fields
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    const [name, csvCategory, description, priceStr] = fields;

    if (!name) continue;

    // Determine category
    let category = csvCategory || "";
    if (!category) {
      category = inferCategory(name);
    }

    const catInfo = CATEGORY_MAP[category];
    if (!catInfo) {
      console.warn(`Unknown category: "${category}" for item "${name}"`);
      continue;
    }

    // Price in cents
    const price = Math.round(parseFloat(priceStr) * 100);

    if (isNaN(price)) {
      console.warn(`Skipping "${name}" - invalid price: "${priceStr}" (fields: ${JSON.stringify(fields)})`);
      continue;
    }

    products.push({
      name: name.trim(),
      description: description || null,
      price,
      categoryName: catInfo.name,
    });
  }

  return products;
}

async function insertProducts(categoryMap, products) {
  // Track sort_order per category
  const sortCounters = {};

  const toInsert = products.map((p) => {
    const categoryId = categoryMap[p.categoryName];
    if (!categoryId) {
      throw new Error(
        `Category "${p.categoryName}" not found in map for product "${p.name}"`
      );
    }

    sortCounters[p.categoryName] = (sortCounters[p.categoryName] || 0) + 1;

    return {
      name: p.name,
      description: p.description,
      price: p.price,
      category_id: categoryId,
      is_available: true,
      sort_order: sortCounters[p.categoryName],
    };
  });

  const { data, error } = await supabase
    .from("products")
    .insert(toInsert)
    .select("id, name, category_id");

  if (error) throw new Error(`Failed to insert products: ${error.message}`);

  console.log(`Inserted ${data.length} products`);
  return data;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("=== Import The Feel By ===\n");

  // 1. Get or create restaurant
  const restaurantId = await getOrCreateRestaurant();

  // 2. Create categories
  const categoryMap = await createCategories(restaurantId);
  console.log("Categories:", Object.keys(categoryMap).join(", "));

  // 3. Parse and insert products
  const products = parseProducts();
  console.log(`\nParsed ${products.length} products from CSV`);

  const inserted = await insertProducts(categoryMap, products);

  // Summary by category
  console.log("\n=== Summary ===");
  const summary = {};
  for (const p of products) {
    summary[p.categoryName] = (summary[p.categoryName] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(summary).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cat}: ${count} items`);
  }

  console.log("\nDone! Restaurant slug: the-feel-by");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
