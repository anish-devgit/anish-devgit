// api/activity.js — DEVOS Activity Feed Panel
// Live stream of recent commits, styled as a terminal log
// Timestamps, repo names, commit messages — all real, all fresh

import { getEvents, getRecentCommits } from "../lib/github.js";
import {
  COLORS, svgOpen, svgClose, terminalChrome, cardBorder,
  scanlineOverlay, statusDot, divider, cursor
} from "../lib/svg.js";

const W = 680;
const H = 220;

function timeAgo(isoStr) {
  if (!isoStr) return "–";
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

// Commit type color coding
function commitColor(msg) {
  const m = msg.toLowerCase();
  if (m.startsWith("feat"))    return COLORS.green;
  if (m.startsWith("fix"))     return COLORS.red;
  if (m.startsWith("docs"))    return COLORS.blue;
  if (m.startsWith("chore"))   return COLORS.textDim;
  if (m.startsWith("refactor")) return COLORS.purple;
  if (m.startsWith("perf"))    return COLORS.orange;
  if (m.startsWith("test"))    return "#a5f3fc";
  return COLORS.textSec;
}

function commitPrefix(msg) {
  const prefixes = ["feat", "fix", "docs", "chore", "refactor", "perf", "test", "style", "ci", "build"];
  for (const p of prefixes) {
    if (msg.toLowerCase().startsWith(p)) return p.toUpperCase().padEnd(8);
  }
  return "COMMIT  ";
}

export default async function handler(req, res) {
  const username = req.query.user || process.env.GITHUB_USERNAME || "unknown";
  const token = process.env.GITHUB_TOKEN;

  res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let events = [];
  try {
    events = await getEvents(username, token);
  } catch (e) {}

  const commits = getRecentCommits(events, 6);

  // Rows start at y=58, each row is 26px
  const rows = commits.map((c, i) => {
    const y = 58 + i * 26;
    const color = commitColor(c.msg);
    const prefix = commitPrefix(c.msg);
    const msg = c.msg.slice(0, 48);
    const ago = timeAgo(c.time);
    const repoLabel = c.repo.slice(0, 20);

    return `
    <!-- Row ${i} -->
    <rect x="10" y="${y - 14}" width="${W - 20}" height="22" rx="2"
      fill="${i % 2 === 0 ? COLORS.surface : "none"}" opacity="0.4"/>
    <text x="18" y="${y}"
      font-family="JetBrains Mono,monospace" font-size="11" fill="${color}" font-weight="500">${prefix}</text>
    <text x="86" y="${y}"
      font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textPri}">${msg}</text>
    <text x="${W - 116}" y="${y}"
      font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">${repoLabel.padEnd(20)}</text>
    <text x="${W - 18}" y="${y}" text-anchor="end"
      font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">${ago}</text>`;
  }).join("");

  // If no commits yet
  const emptyState = commits.length === 0 ? `
  <text x="${W/2}" y="120" text-anchor="middle"
    font-family="JetBrains Mono,monospace" font-size="12" fill="${COLORS.textDim}">no recent public commits</text>` : "";

  // Column headers
  const colHeaders = `
  <text x="18" y="52" font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">TYPE</text>
  <text x="86" y="52" font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">MESSAGE</text>
  <text x="${W - 116}" y="52" font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">REPO</text>
  <text x="${W - 18}" y="52" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" fill="${COLORS.textDim}">WHEN</text>`;

  // Live pulse dot top-right
  const liveIndicator = `
  ${statusDot(W - 46, 19, COLORS.green)}
  <text x="${W - 38}" y="23" font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textSec}">LIVE</text>`;

  const lastY = 58 + commits.length * 26;

  const svg = `${svgOpen(W, H)}
  <rect x="0" y="0" width="${W}" height="${H}" fill="${COLORS.bg}" rx="8"/>

  ${terminalChrome(W, `${username}@devos — commit feed`)}
  ${liveIndicator}
  ${divider(38, W, 0)}
  ${divider(56, W)}
  ${colHeaders}
  ${rows}
  ${emptyState}
  ${divider(H - 18, W)}
  <text x="18" y="${H - 6}" font-family="JetBrains Mono,monospace" font-size="9"
    fill="${COLORS.textDim}">public push events · refreshes on every profile load · powered by github api</text>

  ${scanlineOverlay(W, H)}
  ${cardBorder(W, H)}
${svgClose}`;

  res.send(svg);
}
