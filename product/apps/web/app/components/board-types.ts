export type GarmentCategory = "top" | "bottom" | "outerwear" | "shoes" | "other";

export type LocalGarment = {
  id: string;
  name: string;
  url: string;
  category: GarmentCategory;
};

export type BoardItem = {
  id: string;
  garmentId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
  locked: boolean;
  category: GarmentCategory;
};

export const categoryLabels: Record<GarmentCategory, string> = {
  top: "上衣",
  bottom: "下装",
  outerwear: "外套",
  shoes: "鞋",
  other: "其他"
};

export const categoryLayers: Record<GarmentCategory, number> = {
  shoes: 1,
  bottom: 2,
  top: 3,
  outerwear: 4,
  other: 5
};

export function inferGarmentCategory(name: string): GarmentCategory {
  const normalized = name.toLowerCase();
  if (/鞋|靴|sneaker|shoe|boot/.test(normalized)) return "shoes";
  if (/裤|裙|下装|bottom|pants|skirt/.test(normalized)) return "bottom";
  if (/外套|夹克|大衣|coat|jacket|outer/.test(normalized)) return "outerwear";
  if (/衣|衫|t-shirt|shirt|top|tee/.test(normalized)) return "top";
  return "other";
}
