// api/terminal.js — DEVOS Terminal Panel
// Returns a live SVG that looks like an actual terminal window
// with real GitHub data fetched on every request

import { getUser, getRepos, getEvents, computeScore, scoreRank } from "../lib/github.js";
import {
  COLORS, svgOpen, svgClose, terminalChrome, cardBorder,
  scanlineOverlay, statusDot, cursor, progressBar, divider
} from "../lib/svg.js";

const W = 680;
const H = 220;

function bar(pct, width = 14) {
  const f = Math.round(width * pct / 100);
  return "█".repeat(f) + "░".repeat(width - f);
}

export default async function handler(req, res) {
  const username = req.query.user || process.env.GITHUB_USERNAME || "unknown";
  const token = process.env.GITHUB_TOKEN;

  // Cache-bust: GitHub's CDN will cache unless we tell it not to
  res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
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
  } catch (e) {
    // Render gracefully even if API fails
  }

  const rank = scoreRank(score.total);
  const mission = process.env.DEVOS_MISSION || "building something that matters";
  const learning = process.env.DEVOS_LEARNING || "exploring new technologies";
  const signal = parseInt(process.env.DEVOS_SIGNAL || "80");
  const signalBar = bar(signal, 12);

  // Recent push event info
  const lastPush = events.find(e => e.type === "PushEvent");
  const lastCommit = lastPush?.payload?.commits?.[0]?.message?.split("\n")[0]?.slice(0, 44) || "–";
  const lastRepo = lastPush?.repo?.name?.split("/")[1] || "–";
  const lastDate = lastPush?.created_at ? new Date(lastPush.created_at).toISOString().slice(0, 10) : "–";

  const scoreColor = score.total >= 750 ? COLORS.green :
                     score.total >= 500 ? COLORS.blue  :
                     score.total >= 300 ? COLORS.orange : COLORS.textSec;

  const svg = `${svgOpen(W, H)}
  <!-- Background -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="${COLORS.bg}" rx="8"/>

  ${terminalChrome(W, `${username}@devos — terminal`, "● ONLINE")}

  <!-- Online status dot -->
  ${statusDot(W - 28, 19, COLORS.green, true)}

  ${divider(38, W, 0)}

  <!-- Content area -->
  <!-- Left column: prompt + data -->
  <text x="18" y="65" font-family="JetBrains Mono,monospace" font-size="12" fill="${COLORS.greenDim}">$</text>
  <text x="30" y="65" font-family="JetBrains Mono,monospace" font-size="12" fill="${COLORS.textSec}">devos status</text>

  <!-- MISSION row -->
  <text x="18" y="87" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textDim}">MISSION   </text>
  <text x="102" y="87" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textPri}">${mission.slice(0, 52)}</text>

  <!-- LEARNING row -->
  <text x="18" y="104" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textDim}">LEARNING  </text>
  <text x="102" y="104" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textPri}">${learning.slice(0, 52)}</text>

  <!-- SIGNAL row -->
  <text x="18" y="121" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textDim}">SIGNAL    </text>
  <text x="102" y="121" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.green}">${signalBar}</text>
  <text x="${102 + signalBar.length * 7.2 + 6}" y="121" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textSec}">${signal}%</text>

  <!-- SCORE row -->
  <text x="18" y="138" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textDim}">SCORE     </text>
  <text x="102" y="138" font-family="JetBrains Mono,monospace" font-size="12" font-weight="700" fill="${scoreColor}">${score.total}</text>
  <text x="148" y="138" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textSec}">/ 1000  ·  RANK ${rank.tier} · ${rank.label}</text>

  ${divider(150, W)}

  <!-- LAST DEPLOY row -->
  <text x="18" y="167" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textDim}">LAST PUSH </text>
  <text x="102" y="167" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textSec}">${lastDate}</text>
  <text x="182" y="167" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textDim}"> · </text>
  <text x="196" y="167" font-family="JetBrains Mono,monospace" font-size="11" fill="${COLORS.textPri}">${lastCommit}</text>

  <!-- Second prompt with blinking cursor -->
  <text x="18" y="192" font-family="JetBrains Mono,monospace" font-size="12" fill="${COLORS.greenDim}">$</text>
  <text x="30" y="192" font-family="JetBrains Mono,monospace" font-size="12" fill="${COLORS.textSec}"> </text>
  ${cursor(36, 192)}

  <!-- Right column: stats summary (repos, stars, followers) -->
  <rect x="490" y="48" width="172" height="70" fill="${COLORS.surface}" rx="4"/>
  <rect x="490" y="48" width="172" height="70" rx="4" fill="none" stroke="${COLORS.border2}" stroke-width="0.5"/>

  <text x="576" y="65" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">PROFILE</text>

  <text x="520" y="83" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="16" font-weight="700" fill="${COLORS.blue}">${user.public_repos || 0}</text>
  <text x="520" y="95" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">REPOS</text>

  <text x="576" y="83" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="16" font-weight="700" fill="${COLORS.orange}">${user.followers || 0}</text>
  <text x="576" y="95" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">FOLLOWERS</text>

  <text x="636" y="83" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="16" font-weight="700" fill="${COLORS.green}">${repos.reduce((a, r) => a + (r.stargazers_count || 0), 0)}</text>
  <text x="636" y="95" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10" fill="${COLORS.textDim}">STARS</text>

  ${scanlineOverlay(W, H)}
  ${cardBorder(W, H)}
${svgClose}`;

  res.send(svg);
}
