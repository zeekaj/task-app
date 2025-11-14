// src/utils/colors.ts

// Predefined color palette for projects
export const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#A855F7', // purple
  '#F43F5E', // rose
  '#22D3EE', // sky
  '#FBBF24', // yellow
  '#16A34A', // green
];

/**
 * Generate a random color from the predefined palette
 */
export function generateRandomProjectColor(): string {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
}

/**
 * Convert hex color to Tailwind-compatible background class
 * Returns inline style for custom colors
 */
export function getProjectColorStyle(color?: string): { className?: string; style?: React.CSSProperties } {
  if (!color) return { className: 'bg-gray-600' };
  return { style: { backgroundColor: color } };
}

/**
 * Get a lighter version of the color for backgrounds
 */
export function getProjectColorWithOpacity(color?: string, opacity: number = 0.3): string {
  if (!color) return `rgba(107, 114, 128, ${opacity})`; // gray-600
  
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
