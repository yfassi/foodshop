import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("restaurant_public_id");

    if (!publicId) {
      return NextResponse.json({ error: "Identifiant restaurant manquant" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, owner_id, order_types, menu_layout")
      .eq("public_id", publicId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const { data: categories } = await adminSupabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .returns<Category[]>();

    const categoryIds = (categories || []).map((c) => c.id);

    const { data: products } = await adminSupabase
      .from("products")
      .select("*")
      .in("category_id", categoryIds.length > 0 ? categoryIds : ["__none__"])
      .order("sort_order", { ascending: true })
      .returns<Product[]>();

    const productIds = (products || []).map((p) => p.id);

    const [{ data: modifierGroups }, { data: productSharedLinks }] =
      await Promise.all([
        adminSupabase
          .from("modifier_groups")
          .select("*")
          .in("product_id", productIds.length > 0 ? productIds : ["__none__"])
          .order("sort_order", { ascending: true })
          .returns<ModifierGroup[]>(),
        adminSupabase
          .from("product_shared_groups")
          .select("product_id, shared_group_id, sort_order")
          .in("product_id", productIds.length > 0 ? productIds : ["__none__"]),
      ]);

    const groupIds = (modifierGroups || []).map((mg) => mg.id);
    const sharedGroupIds = [
      ...new Set((productSharedLinks || []).map((l) => l.shared_group_id)),
    ];

    const [{ data: modifiers }, { data: sharedGroups }, { data: sharedMods }] =
      await Promise.all([
        adminSupabase
          .from("modifiers")
          .select("*")
          .in("group_id", groupIds.length > 0 ? groupIds : ["__none__"])
          .order("sort_order", { ascending: true })
          .returns<Modifier[]>(),
        sharedGroupIds.length > 0
          ? adminSupabase
              .from("shared_modifier_groups")
              .select("*")
              .in("id", sharedGroupIds)
              .order("sort_order", { ascending: true })
              .returns<SharedModifierGroup[]>()
          : Promise.resolve({ data: [] as SharedModifierGroup[] }),
        sharedGroupIds.length > 0
          ? adminSupabase
              .from("shared_modifiers")
              .select("*")
              .in("group_id", sharedGroupIds)
              .order("sort_order", { ascending: true })
              .returns<SharedModifier[]>()
          : Promise.resolve({ data: [] as SharedModifier[] }),
      ]);

    const sharedGroupsMap = new Map<string, SharedModifierGroup>();
    for (const g of sharedGroups || []) sharedGroupsMap.set(g.id, g);

    const sharedModifiersByGroup = new Map<string, SharedModifier[]>();
    for (const m of sharedMods || []) {
      const list = sharedModifiersByGroup.get(m.group_id) || [];
      list.push(m);
      sharedModifiersByGroup.set(m.group_id, list);
    }

    const sharedGroupsByProduct = new Map<
      string,
      ModifierGroupWithModifiers[]
    >();
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

    const modifiersByGroup = new Map<string, Modifier[]>();
    for (const mod of modifiers || []) {
      const list = modifiersByGroup.get(mod.group_id) || [];
      list.push(mod);
      modifiersByGroup.set(mod.group_id, list);
    }

    const groupsByProduct = new Map<string, ModifierGroupWithModifiers[]>();
    for (const group of modifierGroups || []) {
      const list = groupsByProduct.get(group.product_id) || [];
      list.push({ ...group, modifiers: modifiersByGroup.get(group.id) || [] });
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
        products: (productsByCategory.get(cat.id) || []).filter(
          (p) => p.is_available
        ),
      }))
      .filter((cat) => cat.products.length > 0);

    const today = new Date().toISOString().slice(0, 10);
    const { data: counterRow } = await adminSupabase
      .from("daily_order_counters")
      .select("current_count")
      .eq("restaurant_id", restaurant.id)
      .eq("order_date", today)
      .eq("prefix", "CPT")
      .maybeSingle();

    const nextCount = (counterRow?.current_count ?? 0) + 1;
    const nextCounterLabel = `CPT_${String(nextCount).padStart(3, "0")}`;

    return NextResponse.json({
      menu,
      order_types: (restaurant.order_types as string[]) || ["dine_in", "takeaway"],
      next_counter_label: nextCounterLabel,
      menu_layout:
        (restaurant as { menu_layout?: string }).menu_layout === "category_grid"
          ? "category_grid"
          : "linear",
    });
  } catch (err) {
    console.error("Admin menu error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
