export interface MaterialAppearance {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  texture?: string;
  category: MaterialCategory;
}

export type MaterialCategory =
  | 'metal'
  | 'plastic'
  | 'wood'
  | 'ceramic'
  | 'glass'
  | 'composite'
  | 'rubber'
  | 'custom';

export const DEFAULT_MATERIALS: MaterialAppearance[] = [
  { id: 'aluminum', name: 'Aluminum', color: '#B0B8C0', metalness: 0.8, roughness: 0.3, opacity: 1, category: 'metal' },
  { id: 'steel', name: 'Steel', color: '#8090A0', metalness: 0.9, roughness: 0.35, opacity: 1, category: 'metal' },
  { id: 'stainless', name: 'Stainless Steel', color: '#C8CCD0', metalness: 0.85, roughness: 0.2, opacity: 1, category: 'metal' },
  { id: 'brass', name: 'Brass', color: '#C8A84A', metalness: 0.9, roughness: 0.25, opacity: 1, category: 'metal' },
  { id: 'copper', name: 'Copper', color: '#C87040', metalness: 0.9, roughness: 0.3, opacity: 1, category: 'metal' },
  { id: 'titanium', name: 'Titanium', color: '#8A9098', metalness: 0.75, roughness: 0.4, opacity: 1, category: 'metal' },
  { id: 'abs', name: 'ABS Plastic', color: '#E8E0D0', metalness: 0, roughness: 0.6, opacity: 1, category: 'plastic' },
  { id: 'pla', name: 'PLA Plastic', color: '#D0D8E0', metalness: 0, roughness: 0.5, opacity: 1, category: 'plastic' },
  { id: 'nylon', name: 'Nylon', color: '#F0EDE8', metalness: 0, roughness: 0.55, opacity: 1, category: 'plastic' },
  { id: 'acrylic', name: 'Acrylic', color: '#E0F0FF', metalness: 0.1, roughness: 0.1, opacity: 0.8, category: 'plastic' },
  { id: 'polycarbonate', name: 'Polycarbonate', color: '#E8E8F0', metalness: 0.05, roughness: 0.15, opacity: 0.85, category: 'plastic' },
  { id: 'oak', name: 'Oak Wood', color: '#A07840', metalness: 0, roughness: 0.8, opacity: 1, category: 'wood' },
  { id: 'walnut', name: 'Walnut', color: '#604030', metalness: 0, roughness: 0.75, opacity: 1, category: 'wood' },
  { id: 'rubber-black', name: 'Rubber (Black)', color: '#303030', metalness: 0, roughness: 0.9, opacity: 1, category: 'rubber' },
  { id: 'glass-clear', name: 'Glass (Clear)', color: '#E8F0FF', metalness: 0.1, roughness: 0.05, opacity: 0.3, category: 'glass' },
  { id: 'carbon-fiber', name: 'Carbon Fiber', color: '#202020', metalness: 0.3, roughness: 0.5, opacity: 1, category: 'composite' },
  { id: 'ceramic-white', name: 'Ceramic (White)', color: '#F0F0F0', metalness: 0.1, roughness: 0.3, opacity: 1, category: 'ceramic' },
];

export const DEFAULT_COMPONENT_COLORS = [
  '#5B9BD5',
  '#ED7D31',
  '#70AD47',
  '#FFC000',
  '#5B5EA6',
  '#44C4A1',
  '#FF6B6B',
  '#C678DD',
  '#E06C75',
  '#98C379',
];
