// api/dna.js — DEVOS Code DNA Panel
// Visual heatmap of commit hours + language distribution bars
// The most visually distinctive panel in the suite

import { getRepos, getEvents, getCommitHeatmap, getLanguageDistribution } from "../lib/github.js";
import {
  COLORS, svgOpen, svgClose, terminalChrome, cardBorder,
  scanlineOverlay, divider, langColor
} from "../lib/svg.js";

const W = 680;
const H = 200;

export default async function handler(req, res) {
  const username = req.query.user || process.env.GITHUB_USERNAME || "unknown";
  const token = process.env.GITHUB_TOKEN;

  res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let repos = [], events = [];
  try {
    [repos, events] = await Promise.all([
      getRepos(username, token),
      getEvents(username, token),
    ]);
  } catch (e) {}

  const heatmap = getCommitHeatmap(events);
  const langs = getLanguageDistribution(repos);

  // Normalize heatmap to 0-1
  const maxH = Math.max(...heatmap, 1);
  const normHeatmap = heatmap.map(v => v / maxH);

  // Heat color based on intensity
  function heatColor(norm) {
    if (norm === 0) return COLORS.border2;
    if (norm < 0.25) return "#1a3a2a";
    if (norm < 0.5)  return "#1e5a30";
    if (norm < 0.75) return COLORS.greenDim;
    return COLORS.green;
  }

  // Heatmap block dimensions
  const hmLeft = 18, hmTop = 58;
  const blockW = 22, blockH = 28, gap = 2;
  const totalHmW = 24 * (blockW + gap) - gap;

  // Hour labels (every 6)
  const hourLabels = [0, 6, 12, 18, 23].map(h => {
    const x = hmLeft + h * (blockW + gap) + blockW / 2;
    return `<text x="${x}" y="${hmTop + blockH + 14}" text-anchor="middle"
      font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">${String(h).padStart(2, "0")}</text>`;
  }).join("");

  // Heatmap blocks
  const blocks = normHeatmap.map((norm, h) => {
    const x = hmLeft + h * (blockW + gap);
    const color = heatColor(norm);
    const opacity = norm === 0 ? 0.3 : 0.7 + norm * 0.3;
    const peakLabel = norm === 1 ? `<text x="${x + blockW/2}" y="${hmTop + blockH/2 + 4}" text-anchor="middle"
      font-family="JetBrains Mono,monospace" font-size="8" font-weight="700" fill="${COLORS.green}">★</text>` : "";
    return `
    <rect x="${x}" y="${hmTop}" width="${blockW}" height="${blockH}" rx="3"
      fill="${color}" opacity="${opacity}"/>
    ${peakLabel}`;
  }).join("");

  // Language bar section (below heatmap)
  const langTop = hmTop + blockH + 26;
  const totalLangW = W - 36;

  // Stacked horizontal language bar
  let langX = 18;
  const langSegments = langs.map(({ lang, pct }) => {
    const segW = Math.round(totalLangW * pct / 100);
    const color = langColor(lang);
    const seg = `<rect x="${langX}" y="${langTop}" width="${segW}" height="8" fill="${color}"
      rx="${langX === 18 ? "4 0 0 4" : langs[langs.length - 1].lang === lang ? "0 4 4 0" : "0"}"/>`;
    langX += segW;
    return seg;
  }).join("");

  // Language legend
  const legendItems = langs.slice(0, 6).map(({ lang, pct }, i) => {
    const color = langColor(lang);
    const itemX = 18 + i * 108;
    return `
    <circle cx="${itemX + 5}" cy="${langTop + 22}" r="4" fill="${color}"/>
    <text x="${itemX + 14}" y="${langTop + 26}"
      font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textSec}">${lang}</text>
    <text x="${itemX + 14 + lang.length * 6.2}" y="${langTop + 26}"
      font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}"> ${pct}%</text>`;
  }).join("");

  // Peak hour annotation
  const peakHour = normHeatmap.indexOf(1);
  const peakLabel = peakHour >= 0 ? `peak: ${String(peakHour).padStart(2,"0")}:00 UTC` : "";

  const svg = `${svgOpen(W, H)}
  <rect x="0" y="0" width="${W}" height="${H}" fill="${COLORS.bg}" rx="8"/>

  ${terminalChrome(W, `${username}@devos — code dna`, peakLabel)}
  ${divider(38, W, 0)}

  <!-- Section label -->
  <text x="18" y="53" font-family="JetBrains Mono,monospace" font-size="10"
    fill="${COLORS.textDim}">COMMIT HEATMAP  (UTC · 00:00 → 23:00)</text>

  <!-- Heatmap blocks -->
  ${blocks}
  ${hourLabels}

  <!-- Language distribution section -->
  <text x="18" y="${langTop - 6}" font-family="JetBrains Mono,monospace" font-size="10"
    fill="${COLORS.textDim}">LANGUAGE DISTRIBUTION</text>
  ${langSegments}
  <rect x="18" y="${langTop}" width="${totalLangW}" height="8" rx="4"
    fill="none" stroke="${COLORS.border2}" stroke-width="0.5"/>
  ${legendItems}

  ${scanlineOverlay(W, H)}
  ${cardBorder(W, H)}
${svgClose}`;

  res.send(svg);
}
