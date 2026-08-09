export type LayoutType =
  | "single_full"
  | "single_frame"
  | "grid_2"
  | "grid_4"
  | "editorial_2";

export interface LayoutDef {
  id: LayoutType;
  label: string;
  description: string;
  capacity: number;
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: "single_full",
    label: "Foto única",
    description: "Uma foto preenchendo todo o slide",
    capacity: 1,
  },
  {
    id: "single_frame",
    label: "Moldura",
    description: "Foto centralizada com moldura branca larga",
    capacity: 1,
  },
  {
    id: "grid_2",
    label: "Duas fotos",
    description: "Duas fotos dividindo o slide",
    capacity: 2,
  },
  {
    id: "grid_4",
    label: "Grade 4",
    description: "Grade com quatro fotos",
    capacity: 4,
  },
  {
    id: "editorial_2",
    label: "Editorial",
    description: "Uma foto grande com duas menores",
    capacity: 3,
  },
];

export const getLayout = (id: string): LayoutDef =>
  LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];

export const layoutCapacity = (id: string): number => getLayout(id).capacity;