export const COLORS = [
  '#ff4d4f', '#ff7875', '#ffa940', '#ffd666',
  '#73d13d', '#36cfc9', '#40a9ff', '#9254de',
  '#eb2f96', '#fa8c16', '#52c41a', '#13c2c2',
];

export function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
