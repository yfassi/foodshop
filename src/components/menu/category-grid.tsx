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
      className="group relative flex aspect-[5/3] flex-col items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-[#E6D9C2] bg-white px-4 py-5 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#1c1410] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-[0.99]"
    >
      {category.image_url ? (
        <Image
          src={category.image_url}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="absolute inset-0 object-cover opacity-90 transition-opacity group-hover:opacity-95"
        />
      ) : (
        <span className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-[#fdf9f3] text-[#1c1410]">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <span
        className={
          category.image_url
            ? "relative z-10 rounded-full bg-white/95 px-3 py-1 text-[15px] font-extrabold tracking-[-0.01em] text-[#1c1410] shadow-[0_1px_2px_rgba(0,0,0,0.06)] md:text-[17px]"
            : "text-[15px] font-extrabold tracking-[-0.01em] text-[#1c1410] md:text-[17px]"
        }
      >
        {category.name}
      </span>
    </button>
  );
}
