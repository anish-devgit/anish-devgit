// api/card.js — DEVOS Developer Card
// The virality engine: a premium "developer identity card"
// Designed to be screenshot and shared on Twitter/X, LinkedIn, Discord
// One image captures: name, score, rank, top langs, streak, and tagline
// Share URL: https://your-devos.vercel.app/api/card?user=USERNAME

import { getUser, getRepos, getEvents, computeScore, scoreRank, getLanguageDistribution } from "../lib/github.js";
import { COLORS, svgOpen, svgClose, arcGauge, langColor, statusDot, scanlineOverlay } from "../lib/svg.js";

const W = 540;
const H = 280;

export default async function handler(req, res) {
  const username = req.query.user || process.env.GITHUB_USERNAME || "unknown";
  const token = process.env.GITHUB_TOKEN;

  res.setHeader("Cache-Control", "public, max-age=3600"); // Card can be cached 1h
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let user = {}, repos = [], events = [], score = { total: 0, dimensions: {} };
  try {
    [user, repos, events] = await Promise.all([
      getUser(username, token),
      getRepos(username, token),
      getEvents(username, token),
    ]);
    score = computeScore(user, repos, events);
  } catch (e) {}

  const rank = scoreRank(score.total);
  const langs = getLanguageDistribution(repos).slice(0, 4);
  const totalStars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const scoreColor = score.total >= 750 ? COLORS.green :
                     score.total >= 500 ? COLORS.blue  :
                     score.total >= 300 ? COLORS.orange : COLORS.textSec;
  const tagline = process.env.DEVOS_TAGLINE || "Ship it. Learn from it. Ship it better.";
  const displayName = user.name || username;

  // Member since year
  const memberYear = user.created_at ? new Date(user.created_at).getFullYear() : "";

  // Background gradient simulation with rects (no gradients rule relaxed for card)
  const bgLayers = `
  <rect x="0" y="0" width="${W}" height="${H}" fill="#0a0e17" rx="12"/>
  <rect x="0" y="0" width="${W}" height="4" fill="${scoreColor}" rx="12" opacity="0.8"/>
  <rect x="0" y="${H-4}" width="${W}" height="4" fill="${scoreColor}" rx="12" opacity="0.3"/>`;

  // Top accent stripe
  const accentStripe = `
  <rect x="0" y="0" width="${W}" height="60" fill="${COLORS.surface}" rx="12"/>
  <rect x="0" y="50" width="${W}" height="10" fill="${COLORS.surface}"/>`;

  // Avatar placeholder (circle with initial)
  const initial = (user.name || username || "?")[0].toUpperCase();
  const avatarCircle = `
  <circle cx="46" cy="30" r="22" fill="${COLORS.surface2}" stroke="${scoreColor}" stroke-width="1.5"/>
  <text x="46" y="36" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="18" font-weight="700"
    fill="${scoreColor}">${initial}</text>`;

  // Name and username
  const nameBlock = `
  <text x="78" y="24"
    font-family="JetBrains Mono,monospace" font-size="16" font-weight="700"
    fill="${COLORS.textPri}">${displayName.slice(0, 22)}</text>
  <text x="78" y="40"
    font-family="JetBrains Mono,monospace" font-size="12"
    fill="${COLORS.textSec}">@${username}</text>`;

  // DEVOS badge top-right
  const devosBadge = `
  <rect x="${W - 100}" y="12" width="84" height="22" rx="4"
    fill="${COLORS.surface2}" stroke="${scoreColor}" stroke-width="0.5"/>
  <text x="${W - 58}" y="27" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="10" font-weight="700"
    fill="${scoreColor}">DEVOS v2</text>`;

  // Score gauge (left of center)
  const gx = 130, gy = 160, gr = 58;
  const gauge = arcGauge(gx, gy, gr, score.total / 10, scoreColor, 9);

  // Score number inside gauge
  const gaugeText = `
  <text x="${gx}" y="${gy - 10}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="26" font-weight="700"
    fill="${scoreColor}">${score.total}</text>
  <text x="${gx}" y="${gy + 8}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="10"
    fill="${COLORS.textDim}">/ 1000</text>
  <rect x="${gx - 36}" y="${gy + 18}" width="72" height="16" rx="3"
    fill="${COLORS.surface}" stroke="${scoreColor}" stroke-width="0.5"/>
  <text x="${gx}" y="${gy + 29}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="9" font-weight="700"
    fill="${scoreColor}">${rank.tier} · ${rank.label}</text>`;

  // Stats column (right of gauge)
  const sx = 250;
  const statsBlock = `
  <!-- Stat boxes -->
  <rect x="${sx}" y="74" width="80" height="44" rx="4"
    fill="${COLORS.surface}" stroke="${COLORS.border2}" stroke-width="0.5"/>
  <text x="${sx + 40}" y="94" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="20" font-weight="700"
    fill="${COLORS.blue}">${totalStars}</text>
  <text x="${sx + 40}" y="110" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">STARS</text>

  <rect x="${sx + 92}" y="74" width="80" height="44" rx="4"
    fill="${COLORS.surface}" stroke="${COLORS.border2}" stroke-width="0.5"/>
  <text x="${sx + 132}" y="94" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="20" font-weight="700"
    fill="${COLORS.orange}">${user.followers || 0}</text>
  <text x="${sx + 132}" y="110" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">FOLLOWERS</text>

  <rect x="${sx + 184}" y="74" width="80" height="44" rx="4"
    fill="${COLORS.surface}" stroke="${COLORS.border2}" stroke-width="0.5"/>
  <text x="${sx + 224}" y="94" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="20" font-weight="700"
    fill="${COLORS.purple}">${user.public_repos || 0}</text>
  <text x="${sx + 224}" y="110" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">REPOS</text>`;

  // Language dots
  const langBlock = langs.map(({ lang, pct }, i) => {
    const lx = sx + i * 68;
    const ly = 134;
    const color = langColor(lang);
    return `
    <circle cx="${lx + 6}" cy="${ly + 7}" r="4" fill="${color}"/>
    <text x="${lx + 14}" y="${ly + 11}"
      font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textSec}">${lang}</text>
    <text x="${lx + 14 + lang.length * 6.2}" y="${ly + 11}"
      font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}"> ${pct}%</text>`;
  }).join("");

  // Tagline
  const taglineEl = `
  <text x="${W / 2}" y="${H - 28}" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="11" font-style="italic"
    fill="${COLORS.textDim}">"${tagline.slice(0, 56)}"</text>`;

  // Footer
  const footer = `
  <line x1="18" y1="${H - 18}" x2="${W - 18}" y2="${H - 18}"
    stroke="${COLORS.border2}" stroke-width="0.5"/>
  <text x="18" y="${H - 7}"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">DEVOS Developer Card · ${memberYear}</text>
  <text x="${W - 18}" y="${H - 7}" text-anchor="end"
    font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">github.com/${username}</text>`;

  const svg = `${svgOpen(W, H)}
  ${bgLayers}
  ${accentStripe}
  ${avatarCircle}
  ${nameBlock}
  ${devosBadge}
  ${gauge}
  ${gaugeText}
  ${statsBlock}
  ${langBlock}
  ${taglineEl}
  ${footer}
  ${scanlineOverlay(W, H)}
  <!-- Outer border -->
  <rect x="0.5" y="0.5" width="${W-1}" height="${H-1}" rx="11.5"
    fill="none" stroke="${scoreColor}" stroke-width="0.5" opacity="0.4"/>
${svgClose}`;

  res.send(svg);
}
