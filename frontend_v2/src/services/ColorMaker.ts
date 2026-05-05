export interface MyColorType { TextColor: string; Color: string; }
function MyColor() {
  const self: MyColorType = { TextColor: 'FFFFFF', Color: 'FF0000' };
  return self;
}

export const ColorMaker: {
  TotalColors: number;
  GetColor: (seed?: number) => any;
  _CalColor: (idx?: number) => number;
  _CalTextColor: (input?: string) => string;
} = {
  TotalColors: 300,
  GetColor: (seed = 0) => {
    const ret = MyColor();
    const idx = seed % ColorMaker.TotalColors;
    const colorVal = ColorMaker._CalColor(idx);
    ret.Color = colorVal.toString(16).padStart(6, '0');
    ret.TextColor = ColorMaker._CalTextColor(ret.Color);
    return ret;
  },
  _CalColor: (idx = 0) => {
    let ret = 0xff0000;
    const full = 0xffffff;
    const total = ColorMaker.TotalColors > 0 ? ColorMaker.TotalColors : 0xff;
    const perVal = full / total;
    if (idx >= 0 && idx <= total) {
      ret = perVal * idx;
    }
    ret = Math.round(ret);
    return ret;
  },
  _CalTextColor: (input = '') => {
    const R = input.substr(0, 2);
    const G = input.substr(2, 2);
    const B = input.substr(4, 2);
    const rVal = parseInt(R, 16);
    const gVal = parseInt(G, 16);
    const bVal = parseInt(B, 16);
    const hsl = rgbToHsl(rVal, gVal, bVal);
    hsl.L = (hsl.L + 0.5) % 1.0;
    const rgb = hslToRgb(hsl.H, hsl.S, hsl.L);
    const ret = (rgb.R << 16) + (rgb.G << 8) + rgb.B;
    return ret.toString(16).padStart(6, '0');
  },
};

export const rgbToHsl = (R: number, G: number, B: number) => {
  const r = R / 255;
  const g = G / 255;
  const b = B / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = (max + min) / 2;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { H: h, S: s, L: l };
};

export const hslToRgb = (h: number, s: number, l: number) => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { R: Math.round(r * 255), G: Math.round(g * 255), B: Math.round(b * 255) };
};
