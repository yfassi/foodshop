import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuGrid } from "@/components/menu/menu-grid";
import type {
  Category,
  Product,
  ModifierGroup,
  Modifier,
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
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, is_accepting_orders")
    .eq("slug", slug)
    .single();

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

  // Assemble the data
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
    const list = productsByCategory.get(product.category_id) || [];
    list.push({
      ...product,
      modifier_groups: groupsByProduct.get(product.id) || [],
    });
    productsByCategory.set(product.category_id, list);
  }

  const menu: CategoryWithProducts[] = (categories || []).map((cat) => ({
    ...cat,
    products: productsByCategory.get(cat.id) || [],
  }));

  return (
    <MenuGrid
      categories={menu}
      isAcceptingOrders={restaurant.is_accepting_orders}
      slug={slug}
    />
  );
}
