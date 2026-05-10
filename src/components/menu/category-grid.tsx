"use client";

import Image from "next/image";
import type { CategoryWithProducts } from "@/lib/types";
import { getCategoryIcon } from "@/lib/category-icons";

export function CategoryTileGrid({
  categories,
  onSelect,
}: {
  categories: CategoryWithProducts[];
  onSelect: (categoryId: string) => void;
}) {
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {categories.map((cat) => (
          <CategoryTile key={cat.id} category={cat} onClick={() => onSelect(cat.id)} />
        ))}
      </div>
    </div>
  );
}

function CategoryTile({
  category,
  onClick,
}: {
  category: CategoryWithProducts;
  onClick: () => void;
}) {
  const Icon = getCategoryIcon(category.icon);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-[#E6D9C2] bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#1c1410] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-[0.99]"
    >
      <div className="relative aspect-[5/3] w-full bg-[#fdf9f3]">
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-8 w-8 text-[#1c1410]" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center px-3 py-3">
        <span className="text-center text-[15px] font-extrabold tracking-[-0.01em] text-[#1c1410] md:text-[17px]">
          {category.name}
        </span>
      </div>
    </button>
  );
}
