// lib/svg.js — DEVOS SVG Design System
// All panels use these primitives for visual consistency

export const COLORS = {
  bg:        "#0d1117",
  surface:   "#161b22",
  surface2:  "#1c2128",
  border:    "#30363d",
  border2:   "#21262d",
  green:     "#3fb950",
  greenDim:  "#238636",
  blue:      "#58a6ff",
  blueDim:   "#1f6feb",
  orange:    "#f0883e",
  purple:    "#bc8cff",
  red:       "#f85149",
  textPri:   "#e6edf3",
  textSec:   "#8b949e",
  textDim:   "#484f58",
  cursor:    "#3fb950",
};

// Language color map (subset of GitHub's linguist colors)
export const LANG_COLORS = {
  TypeScript:  "#3178c6",
  JavaScript:  "#f1e05a",
  Python:      "#3572A5",
  Rust:        "#dea584",
  Go:          "#00ADD8",
  Java:        "#b07219",
  "C++":       "#f34b7d",
  C:           "#555555",
  Ruby:        "#701516",
  Swift:       "#F05138",
  Kotlin:      "#A97BFF",
  PHP:         "#4F5D95",
  Shell:       "#89e051",
  HTML:        "#e34c26",
  CSS:         "#563d7c",
  Dart:        "#00B4AB",
  Scala:       "#c22d40",
  Haskell:     "#5e5086",
  Elixir:      "#6e4a7e",
  Clojure:     "#db5855",
  Vue:         "#41b883",
  Svelte:      "#ff3e00",
};

export function langColor(lang) {
  return LANG_COLORS[lang] || "#8b949e";
}

// Common SVG head: opens the svg element with dark bg, JetBrains Mono font
export function svgOpen(width, height, extra = "") {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg" role="img"
  style="font-family:'JetBrains Mono',monospace;background:${COLORS.bg}" ${extra}>
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&amp;display=swap');
      @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes fillBar { from{width:0} to{width:var(--w)} }
      @keyframes countUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
    </style>
    <!-- Scanline overlay pattern -->
    <pattern id="scanlines" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="1" height="1" fill="white" opacity="0.018"/>
    </pattern>
    <!-- Glow filter for accent elements -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Subtle inner shadow for surfaces -->
    <filter id="inset" x="0" y="0" width="100%" height="100%">
      <feOffset dx="0" dy="1"/>
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>`;
}

export const svgClose = `</svg>`;

// Terminal window chrome: title bar with traffic-light dots + title text
export function terminalChrome(width, title, subtitle = "") {
  return `
  <!-- Window chrome -->
  <rect x="0" y="0" width="${width}" height="38" fill="${COLORS.surface}" rx="0"/>
  <rect x="0" y="0" width="${width}" height="1" fill="${COLORS.border}"/>
  <rect x="0" y="37" width="${width}" height="1" fill="${COLORS.border}"/>
  <!-- Traffic lights -->
  <circle cx="20" cy="19" r="5.5" fill="#ff5f56"/>
  <circle cx="37" cy="19" r="5.5" fill="#ffbd2e"/>
  <circle cx="54" cy="19" r="5.5" fill="#27c93f"/>
  <!-- Title -->
  <text x="${width / 2}" y="24" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="12" font-weight="500"
    fill="${COLORS.textSec}">${title}</text>
  ${subtitle ? `<text x="${width - 16}" y="24" text-anchor="end"
    font-family="JetBrains Mono,monospace" font-size="11"
    fill="${COLORS.textDim}">${subtitle}</text>` : ""}`;
}

// Outer card border with rounded corners
export function cardBorder(width, height) {
  return `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}"
    rx="8" fill="none" stroke="${COLORS.border}" stroke-width="1"/>`;
}

// Scanline overlay (subtle CRT feel)
export function scanlineOverlay(width, height) {
  return `<rect x="0" y="0" width="${width}" height="${height}"
    fill="url(#scanlines)" rx="8" pointer-events="none"/>`;
}

// Status dot (pulsing or solid)
export function statusDot(x, y, color = COLORS.green, pulse = true) {
  return `<circle cx="${x}" cy="${y}" r="4" fill="${color}"
    ${pulse ? `style="animation:pulse 2s ease-in-out infinite"` : ""}/>`;
}

// Progress bar (filled, with optional label)
export function progressBar(x, y, totalW, filledW, color, height = 6, radius = 3) {
  return `
  <rect x="${x}" y="${y}" width="${totalW}" height="${height}" rx="${radius}"
    fill="${COLORS.border2}"/>
  <rect x="${x}" y="${y}" width="${filledW}" height="${height}" rx="${radius}"
    fill="${color}" style="animation:fillBar 1.2s cubic-bezier(.4,0,.2,1) forwards"/>`;
}

// Monospaced label + value pair
export function labelValue(x, y, label, value, valueColor = COLORS.textPri) {
  return `
  <text x="${x}" y="${y}" font-family="JetBrains Mono,monospace" font-size="12"
    fill="${COLORS.textSec}">${label}</text>
  <text x="${x + label.length * 7.5 + 8}" y="${y}" font-family="JetBrains Mono,monospace"
    font-size="12" fill="${valueColor}" font-weight="500">${value}</text>`;
}

// Blinking cursor block
export function cursor(x, y) {
  return `<rect x="${x}" y="${y - 11}" width="7" height="14" fill="${COLORS.cursor}"
    rx="1" style="animation:blink 1s step-end infinite"/>`;
}

// Section divider line
export function divider(y, width, marginX = 16) {
  return `<line x1="${marginX}" y1="${y}" x2="${width - marginX}" y2="${y}"
    stroke="${COLORS.border2}" stroke-width="0.5"/>`;
}

// Arc/gauge for score display
export function arcGauge(cx, cy, r, pct, color, strokeW = 10) {
  const circumference = 2 * Math.PI * r;
  // Arc from -225deg to +45deg (270deg sweep = 3/4 circle, bottom-left to bottom-right)
  const sweep = 270;
  const startAngle = -225 * (Math.PI / 180);
  const endAngle = startAngle + (sweep * (Math.PI / 180));
  // Background arc
  const bgStartX = cx + r * Math.cos(startAngle);
  const bgStartY = cy + r * Math.sin(startAngle);
  const bgEndX = cx + r * Math.cos(endAngle);
  const bgEndY = cy + r * Math.sin(endAngle);

  // Filled arc (pct of sweep)
  const fillAngle = startAngle + (sweep * pct / 100) * (Math.PI / 180);
  const fillEndX = cx + r * Math.cos(fillAngle);
  const fillEndY = cy + r * Math.sin(fillAngle);
  const largeArc1 = sweep * pct / 100 > 180 ? 1 : 0;
  const largeArcBg = sweep > 180 ? 1 : 0;

  return `
  <path d="M ${bgStartX} ${bgStartY} A ${r} ${r} 0 ${largeArcBg} 1 ${bgEndX} ${bgEndY}"
    fill="none" stroke="${COLORS.border2}" stroke-width="${strokeW}" stroke-linecap="round"/>
  <path d="M ${bgStartX} ${bgStartY} A ${r} ${r} 0 ${largeArc1} 1 ${fillEndX} ${fillEndY}"
    fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round"
    filter="url(#glow)"/>`;
}
