import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuGrid } from "@/components/menu/menu-grid";
import type {
  Category,
  Product,
  ModifierGroup,
  Modifier,
  SharedModifierGroup,
  SharedModifier,
  CategoryWithProducts,
  ProductWithModifiers,
  ModifierGroupWithModifiers,
} from "@/lib/types";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (restaurantError) {
    console.error("[MenuPage] Restaurant fetch error:", restaurantError.message, "slug:", slug);
  }

  if (!restaurant) notFound();

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

  // Fetch products
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .in(
      "category_id",
      (categories || []).map((c) => c.id)
    )
    .order("sort_order", { ascending: true })
    .returns<Product[]>();

  // Fetch modifier groups
  const { data: modifierGroups } = await supabase
    .from("modifier_groups")
    .select("*")
    .in(
      "product_id",
      (products || []).map((p) => p.id)
    )
    .order("sort_order", { ascending: true })
    .returns<ModifierGroup[]>();

  // Fetch modifiers
  const { data: modifiers } = await supabase
    .from("modifiers")
    .select("*")
    .in(
      "group_id",
      (modifierGroups || []).map((mg) => mg.id)
    )
    .order("sort_order", { ascending: true })
    .returns<Modifier[]>();

  // Fetch shared modifier groups linked to products
  const productIds = (products || []).map((p) => p.id);
  const { data: productSharedLinks } = await supabase
    .from("product_shared_groups")
    .select("product_id, shared_group_id, sort_order")
    .in("product_id", productIds.length > 0 ? productIds : ["__none__"]);

  const sharedGroupIds = [
    ...new Set((productSharedLinks || []).map((l) => l.shared_group_id)),
  ];

  let sharedGroupsMap = new Map<string, SharedModifierGroup>();
  let sharedModifiersByGroup = new Map<string, SharedModifier[]>();

  if (sharedGroupIds.length > 0) {
    const { data: sharedGroups } = await supabase
      .from("shared_modifier_groups")
      .select("*")
      .in("id", sharedGroupIds)
      .order("sort_order", { ascending: true })
      .returns<SharedModifierGroup[]>();

    for (const g of sharedGroups || []) {
      sharedGroupsMap.set(g.id, g);
    }

    const { data: sharedMods } = await supabase
      .from("shared_modifiers")
      .select("*")
      .in("group_id", sharedGroupIds)
      .order("sort_order", { ascending: true })
      .returns<SharedModifier[]>();

    for (const m of sharedMods || []) {
      const list = sharedModifiersByGroup.get(m.group_id) || [];
      list.push(m);
      sharedModifiersByGroup.set(m.group_id, list);
    }
  }

  // Build shared groups per product (converted to ModifierGroupWithModifiers format)
  const sharedGroupsByProduct = new Map<string, ModifierGroupWithModifiers[]>();
  for (const link of productSharedLinks || []) {
    const group = sharedGroupsMap.get(link.shared_group_id);
    if (!group) continue;
    const mods = sharedModifiersByGroup.get(group.id) || [];
    const list = sharedGroupsByProduct.get(link.product_id) || [];
    list.push({
      id: group.id,
      name: group.name,
      product_id: link.product_id,
      min_select: group.min_select,
      max_select: group.max_select,
      sort_order: link.sort_order,
      created_at: group.created_at,
      modifiers: mods.map((m) => ({
        id: m.id,
        name: m.name,
        price_extra: m.price_extra,
        group_id: m.group_id,
        is_available: m.is_available,
        sort_order: m.sort_order,
        created_at: m.created_at,
      })),
    });
    sharedGroupsByProduct.set(link.product_id, list);
  }

  // Assemble per-product modifier groups
  const modifiersByGroup = new Map<string, Modifier[]>();
  for (const mod of modifiers || []) {
    const list = modifiersByGroup.get(mod.group_id) || [];
    list.push(mod);
    modifiersByGroup.set(mod.group_id, list);
  }

  const groupsByProduct = new Map<string, ModifierGroupWithModifiers[]>();
  for (const group of modifierGroups || []) {
    const list = groupsByProduct.get(group.product_id) || [];
    list.push({
      ...group,
      modifiers: modifiersByGroup.get(group.id) || [],
    });
    groupsByProduct.set(group.product_id, list);
  }

  const productsByCategory = new Map<string, ProductWithModifiers[]>();
  for (const product of products || []) {
    const perProduct = groupsByProduct.get(product.id) || [];
    const shared = sharedGroupsByProduct.get(product.id) || [];
    const list = productsByCategory.get(product.category_id) || [];
    list.push({
      ...product,
      modifier_groups: [...shared, ...perProduct],
    });
    productsByCategory.set(product.category_id, list);
  }

  const menu: CategoryWithProducts[] = (categories || [])
    .map((cat) => ({
      ...cat,
      products: (productsByCategory.get(cat.id) || []).filter((p) => p.is_available),
    }))
    .filter((cat) => cat.products.length > 0);

  return (
    <MenuGrid
      categories={menu}
      isAcceptingOrders={restaurant.is_accepting_orders}
      openingHours={restaurant.opening_hours as Record<string, unknown> | null}
      slug={slug}
      restaurantName={restaurant.name}
      logoUrl={restaurant.logo_url}
      orderTypes={restaurant.order_types as ("dine_in" | "takeaway")[]}
      loyaltyEnabled={restaurant.loyalty_enabled}
    />
  );
}
