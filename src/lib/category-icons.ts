import {
  Utensils, Beef, Ham, Fish, EggFried, Sandwich, Pizza, Salad,
  Coffee, CupSoda, GlassWater, Beer, Wine, Milk,
  Cake, CakeSlice, IceCreamCone, Cookie, Croissant, Candy,
  ChefHat, Flame, Leaf, Apple, Cherry, Grape, Wheat, Soup,
  Popcorn, Star, Sparkles,
  Hamburger, Donut, Drumstick, Banana, Carrot, Citrus,
  Shrimp, Egg, Nut, Martini, IceCreamBowl, Lollipop,
  Popsicle, Vegan, HandPlatter, Sprout,
  type LucideIcon,
} from "lucide-react";

export interface CategoryIconOption {
  name: string;
  label: string;
  Icon: LucideIcon;
}

export const CATEGORY_ICONS: CategoryIconOption[] = [
  { name: "utensils", label: "Couverts", Icon: Utensils },
  { name: "beef", label: "Viande", Icon: Beef },
  { name: "ham", label: "Jambon", Icon: Ham },
  { name: "fish", label: "Poisson", Icon: Fish },
  { name: "egg-fried", label: "Oeuf", Icon: EggFried },
  { name: "sandwich", label: "Sandwich", Icon: Sandwich },
  { name: "pizza", label: "Pizza", Icon: Pizza },
  { name: "salad", label: "Salade", Icon: Salad },
  { name: "coffee", label: "Café", Icon: Coffee },
  { name: "cup-soda", label: "Soda", Icon: CupSoda },
  { name: "glass-water", label: "Eau", Icon: GlassWater },
  { name: "beer", label: "Bière", Icon: Beer },
  { name: "wine", label: "Vin", Icon: Wine },
  { name: "milk", label: "Lait", Icon: Milk },
  { name: "cake", label: "Gâteau", Icon: Cake },
  { name: "cake-slice", label: "Part", Icon: CakeSlice },
  { name: "ice-cream-cone", label: "Glace", Icon: IceCreamCone },
  { name: "cookie", label: "Cookie", Icon: Cookie },
  { name: "croissant", label: "Croissant", Icon: Croissant },
  { name: "candy", label: "Bonbon", Icon: Candy },
  { name: "chef-hat", label: "Chef", Icon: ChefHat },
  { name: "flame", label: "Flamme", Icon: Flame },
  { name: "leaf", label: "Végétal", Icon: Leaf },
  { name: "apple", label: "Pomme", Icon: Apple },
  { name: "cherry", label: "Cerise", Icon: Cherry },
  { name: "grape", label: "Raisin", Icon: Grape },
  { name: "wheat", label: "Blé", Icon: Wheat },
  { name: "soup", label: "Soupe", Icon: Soup },
  { name: "popcorn", label: "Popcorn", Icon: Popcorn },
  { name: "hamburger", label: "Burger", Icon: Hamburger },
  { name: "donut", label: "Donut", Icon: Donut },
  { name: "drumstick", label: "Poulet", Icon: Drumstick },
  { name: "banana", label: "Banane", Icon: Banana },
  { name: "carrot", label: "Carotte", Icon: Carrot },
  { name: "citrus", label: "Agrume", Icon: Citrus },
  { name: "shrimp", label: "Crevette", Icon: Shrimp },
  { name: "egg", label: "Oeuf", Icon: Egg },
  { name: "nut", label: "Noix", Icon: Nut },
  { name: "martini", label: "Cocktail", Icon: Martini },
  { name: "ice-cream-bowl", label: "Coupe glacée", Icon: IceCreamBowl },
  { name: "lollipop", label: "Sucette", Icon: Lollipop },
  { name: "popsicle", label: "Esquimau", Icon: Popsicle },
  { name: "vegan", label: "Végan", Icon: Vegan },
  { name: "hand-platter", label: "Service", Icon: HandPlatter },
  { name: "sprout", label: "Pousse", Icon: Sprout },
  { name: "star", label: "Star", Icon: Star },
  { name: "sparkles", label: "Spécial", Icon: Sparkles },
];

const iconMap = new Map(CATEGORY_ICONS.map((i) => [i.name, i.Icon]));

export function getCategoryIcon(name: string | null): LucideIcon {
  if (!name) return Utensils;
  return iconMap.get(name) ?? Utensils;
}
