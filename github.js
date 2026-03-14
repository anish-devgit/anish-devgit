// lib/github.js — shared GitHub API client for all DEVOS panels

const GITHUB_API = "https://api.github.com";

async function ghFetch(path, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function getUser(username, token) {
  return ghFetch(`/users/${username}`, token);
}

export async function getRepos(username, token) {
  const repos = [];
  let page = 1;
  while (page <= 3) {
    const batch = await ghFetch(
      `/users/${username}/repos?per_page=100&page=${page}&type=owner&sort=updated`,
      token
    );
    if (!batch || !Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos;
}

export async function getEvents(username, token) {
  return ghFetch(`/users/${username}/events/public?per_page=100`, token) || [];
}

export function computeScore(user, repos, events) {
  // 1. Commit Velocity (200)
  const pushEvents = events.filter((e) => e.type === "PushEvent");
  const recentCommits = pushEvents
    .slice(0, 20)
    .reduce((acc, e) => acc + (e.payload?.commits?.length || 0), 0);
  const velocityScore = Math.min(200, Math.round(recentCommits * 4));

  // 2. Code Influence (200)
  const totalStars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const influenceScore = Math.min(200, Math.round(Math.log1p(totalStars) * 28));

  // 3. Collaboration (200)
  const collabEvents = events.filter((e) =>
    ["PullRequestEvent", "IssuesEvent", "PullRequestReviewEvent"].includes(e.type)
  );
  const collabScore = Math.min(200, collabEvents.length * 10);

  // 4. Consistency (200)
  const activeDays = new Set(events.map((e) => e.created_at?.slice(0, 10)).filter(Boolean));
  const consistencyScore = Math.min(200, activeDays.size * 12);

  // 5. Breadth (200)
  const langs = new Set(repos.map((r) => r.language).filter(Boolean));
  const breadthScore = Math.min(200, repos.length * 3 + langs.size * 8);

  const total =
    velocityScore + influenceScore + collabScore + consistencyScore + breadthScore;

  return {
    total,
    dimensions: {
      velocity: velocityScore,
      influence: influenceScore,
      collab: collabScore,
      consistency: consistencyScore,
      breadth: breadthScore,
    },
  };
}

export function scoreRank(total) {
  if (total >= 900) return { label: "LEGENDARY", tier: "S" };
  if (total >= 750) return { label: "ELITE", tier: "A+" };
  if (total >= 600) return { label: "SENIOR", tier: "A" };
  if (total >= 450) return { label: "MID-LEVEL", tier: "B" };
  if (total >= 300) return { label: "GROWING", tier: "C" };
  return { label: "STARTED", tier: "D" };
}

export function getCommitHeatmap(events) {
  const hours = new Array(24).fill(0);
  for (const e of events) {
    if (e.type === "PushEvent" && e.created_at) {
      const h = new Date(e.created_at).getUTCHours();
      hours[h] += e.payload?.commits?.length || 1;
    }
  }
  return hours;
}

export function getLanguageDistribution(repos) {
  const counts = {};
  for (const r of repos) {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, count]) => ({ lang, pct: Math.round((count / total) * 100) }));
}

export function getRecentCommits(events, limit = 5) {
  const commits = [];
  const seen = new Set();
  for (const e of events) {
    if (e.type !== "PushEvent") continue;
    const repo = e.repo?.name?.split("/")[1] || "";
    for (const c of e.payload?.commits || []) {
      const msg = c.message?.split("\n")[0]?.slice(0, 52) || "";
      const key = `${repo}:${msg}`;
      if (!seen.has(key)) {
        seen.add(key);
        commits.push({ repo, msg, time: e.created_at });
      }
      if (commits.length >= limit) return commits;
    }
    if (commits.length >= limit) break;
  }
  return commits;
}
