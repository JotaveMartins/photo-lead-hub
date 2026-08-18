export type LayoutType =
  | "single_full"
  | "single_frame"
  | "grid_2"
  | "grid_4"
  | "editorial_2"
  | "strip_2"
  | "strip_3"
  | "strip_plus_2";

/** Formato esperado de cada espaço do template. */
export type SlotShape = "tall" | "wide" | "any";

export interface LayoutDef {
  id: LayoutType;
  label: string;
  description: string;
  capacity: number;
  slots: SlotShape[];
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: "single_full",
    label: "Foto única",
    description: "Uma foto preenchendo todo o slide",
    capacity: 1,
    slots: ["tall"],
  },
  {
    id: "single_frame",
    label: "Moldura",
    description: "Foto centralizada com moldura branca larga",
    capacity: 1,
    slots: ["any"],
  },
  {
    id: "grid_2",
    label: "Duas fotos",
    description: "Duas fotos dividindo o slide",
    capacity: 2,
    slots: ["tall", "tall"],
  },
  {
    id: "grid_4",
    label: "Grade 4",
    description: "Grade com quatro fotos",
    capacity: 4,
    slots: ["any", "any", "any", "any"],
  },
  {
    id: "editorial_2",
    label: "Editorial",
    description: "Uma foto grande com duas menores",
    capacity: 3,
    slots: ["tall", "any", "any"],
  },
  {
    id: "strip_2",
    label: "Duas faixas",
    description: "Duas fotos horizontais, metade e metade",
    capacity: 2,
    slots: ["wide", "wide"],
  },
  {
    id: "strip_3",
    label: "Três faixas",
    description: "Três fotos horizontais empilhadas",
    capacity: 3,
    slots: ["wide", "wide", "wide"],
  },
  {
    id: "strip_plus_2",
    label: "Faixa + duas",
    description: "Uma foto horizontal em cima e duas verticais embaixo",
    capacity: 3,
    slots: ["wide", "tall", "tall"],
  },
];

export const getLayout = (id: string): LayoutDef =>
  LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];

export const layoutCapacity = (id: string): number => getLayout(id).capacity;

export const layoutSlots = (id: string): SlotShape[] => getLayout(id).slots;

export type PhotoShape = "landscape" | "portrait" | "square";

/** A foto cabe bem nesse espaço? */
export const shapeFits = (slot: SlotShape, shape: PhotoShape): boolean => {
  if (slot === "any") return true;
  if (slot === "wide") return shape === "landscape" || shape === "square";
  return shape === "portrait" || shape === "square";
};