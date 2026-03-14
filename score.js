// api/score.js — DEVOS Score Panel
// Circular arc gauge with 5 dimension breakdown bars
// Data is live on every request

import { getUser, getRepos, getEvents, computeScore, scoreRank } from "../lib/github.js";
import {
  COLORS, svgOpen, svgClose, terminalChrome, cardBorder,
  scanlineOverlay, arcGauge, divider
} from "../lib/svg.js";

const W = 680;
const H = 200;

function miniBar(x, y, pct, color, label, pts, maxPts) {
  const totalW = 220;
  const filledW = Math.round(totalW * pct / 100);
  return `
  <text x="${x}" y="${y}" font-family="JetBrains Mono,monospace" font-size="10.5"
    fill="${COLORS.textDim}">${label.padEnd(20)}</text>
  <rect x="${x}" y="${y + 4}" width="${totalW}" height="5" rx="2.5" fill="${COLORS.border2}"/>
  <rect x="${x}" y="${y + 4}" width="${filledW}" height="5" rx="2.5" fill="${color}"/>
  <text x="${x + totalW + 6}" y="${y + 10}" font-family="JetBrains Mono,monospace" font-size="10"
    fill="${color}" font-weight="500">${pts}/${maxPts}</text>`;
}

export default async function handler(req, res) {
  const username = req.query.user || process.env.GITHUB_USERNAME || "unknown";
  const token = process.env.GITHUB_TOKEN;

  res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let user = {}, repos = [], events = [], score = { total: 0, dimensions: { velocity: 0, influence: 0, collab: 0, consistency: 0, breadth: 0 } };
  try {
    [user, repos, events] = await Promise.all([
      getUser(username, token),
      getRepos(username, token),
      getEvents(username, token),
    ]);
    score = computeScore(user, repos, events);
  } catch (e) {}

  const rank = scoreRank(score.total);
  const pct = score.total / 10; // score.total max 1000

  const scoreColor = score.total >= 750 ? COLORS.green :
                     score.total >= 500 ? COLORS.blue  :
                     score.total >= 300 ? COLORS.orange : COLORS.textSec;

  // Gauge center
  const gx = 120, gy = 135, gr = 68;

  const dims = score.dimensions;
  const dimRows = [
    { label: "COMMIT VELOCITY", pts: dims.velocity,    color: COLORS.green  },
    { label: "CODE INFLUENCE",  pts: dims.influence,   color: COLORS.blue   },
    { label: "COLLABORATION",   pts: dims.collab,      color: COLORS.purple },
    { label: "CONSISTENCY",     pts: dims.consistency, color: COLORS.orange },
    { label: "BREADTH",         pts: dims.breadth,     color: COLORS.green  },
  ];

  const svg = `${svgOpen(W, H)}
  <rect x="0" y="0" width="${W}" height="${H}" fill="${COLORS.bg}" rx="8"/>

  ${terminalChrome(W, `${username}@devos — benchmark`, `TOTAL ${score.total}/1000`)}
  ${divider(38, W, 0)}

  <!-- Gauge background ring + filled arc -->
  ${arcGauge(gx, gy, gr, pct, scoreColor, 10)}

  <!-- Score number (center of gauge) -->
  <text x="${gx}" y="${gy - 8}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="28" font-weight="700"
    fill="${scoreColor}">${score.total}</text>
  <text x="${gx}" y="${gy + 10}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">/ 1000</text>

  <!-- Rank label below gauge -->
  <rect x="${gx - 42}" y="${gy + 22}" width="84" height="18" rx="3"
    fill="${COLORS.surface}" stroke="${scoreColor}" stroke-width="0.5" opacity="0.9"/>
  <text x="${gx}" y="${gy + 34}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="10" font-weight="700"
    fill="${scoreColor}">${rank.tier} · ${rank.label}</text>

  <!-- Gauge axis labels -->
  <text x="${gx - gr - 14}" y="${gy + 28}" text-anchor="end"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">0</text>
  <text x="${gx + gr + 14}" y="${gy + 28}" text-anchor="start"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">1000</text>

  <!-- Vertical divider between gauge and bars -->
  <line x1="226" y1="50" x2="226" y2="${H - 16}"
    stroke="${COLORS.border2}" stroke-width="0.5"/>

  <!-- Dimension bars (right side) -->
  <text x="244" y="62"
    font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">DIMENSION BREAKDOWN</text>

  ${dimRows.map((d, i) => miniBar(244, 74 + i * 26, d.pts / 2, d.color, d.label, d.pts, 200)).join("")}

  <!-- Total bar at bottom -->
  ${divider(H - 30, W)}
  <text x="244" y="${H - 14}"
    font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">updated every 12h via github actions · devos-setup to configure</text>

  ${scanlineOverlay(W, H)}
  ${cardBorder(W, H)}
${svgClose}`;

  res.send(svg);
}
