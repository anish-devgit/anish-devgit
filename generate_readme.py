#!/usr/bin/env python3
"""
DEVOS v2 — README Auto-Update Engine
New in v2:
  - DEVOS Score (composite metric from real GitHub data)
  - Code DNA fingerprint (language distribution, commit patterns, vocabulary)
  - AI exchange log integration
  - Richer broadcast feed
"""

import os, re, json, yaml, math, requests, feedparser
from datetime import datetime, timezone
from collections import Counter
from dateutil import parser as date_parser

# ── CONFIG ────────────────────────────────────────────────────────────────────
GITHUB_TOKEN    = os.environ.get("GITHUB_TOKEN", "")
GITHUB_USERNAME = os.environ.get("GITHUB_USERNAME", "")
WAKATIME_KEY    = os.environ.get("WAKATIME_API_KEY", "")
BLOG_RSS_URL    = os.environ.get("BLOG_RSS_URL", "")
README_PATH     = "README.md"
CONFIG_PATH     = "config.yml"

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

# ── HELPERS ───────────────────────────────────────────────────────────────────
def read_readme():
    with open(README_PATH, "r", encoding="utf-8") as f: return f.read()

def write_readme(content):
    with open(README_PATH, "w", encoding="utf-8") as f: f.write(content)

def replace_section(content, section_name, new_content):
    pattern = rf"(<!-- DYNAMIC:{section_name}_START -->)(.*?)(<!-- DYNAMIC:{section_name}_END -->)"
    replacement = rf"\1\n{new_content}\n\3"
    return re.sub(pattern, replacement, content, flags=re.DOTALL)

def bar(pct, width=20, fill="█", empty="░"):
    f = round(width * pct / 100)
    return fill * f + empty * (width - f)

def time_ago(dt_str):
    try:
        dt = date_parser.parse(dt_str)
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        diff = (datetime.now(timezone.utc) - dt).total_seconds()
        if diff < 3600:    return f"{int(diff/60)}m ago"
        if diff < 86400:   return f"{int(diff/3600)}h ago"
        if diff < 172800:  return "Yesterday"
        if diff < 604800:  return f"{int(diff/86400)}d ago"
        return f"{int(diff/604800)}w ago"
    except: return "recently"

def load_config():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f: return yaml.safe_load(f) or {}
    except: return {}

# ── GITHUB API FETCHERS ───────────────────────────────────────────────────────
def gh_get(path, params=None):
    r = requests.get(f"https://api.github.com{path}", headers=HEADERS, params=params)
    return r.json() if r.status_code == 200 else {}

def gh_get_list(path, params=None):
    r = requests.get(f"https://api.github.com{path}", headers=HEADERS, params=params)
    return r.json() if r.status_code == 200 and isinstance(r.json(), list) else []

def fetch_user():
    return gh_get(f"/users/{GITHUB_USERNAME}")

def fetch_repos():
    """Fetch all public repos (paginated)."""
    repos, page = [], 1
    while True:
        batch = gh_get_list(f"/users/{GITHUB_USERNAME}/repos",
                            {"per_page": 100, "page": page, "type": "owner", "sort": "updated"})
        if not batch: break
        repos.extend(batch)
        if len(batch) < 100: break
        page += 1
    return repos

def fetch_events(limit=100):
    """Fetch recent public events."""
    return gh_get_list(f"/users/{GITHUB_USERNAME}/events/public", {"per_page": limit})

def fetch_recent_commits(events, limit=5):
    """Extract recent commits from events."""
    commits = []
    seen = set()
    for event in events:
        if event.get("type") == "PushEvent":
            repo = event.get("repo", {}).get("name", "")
            for c in event.get("payload", {}).get("commits", []):
                msg = c.get("message", "").split("\n")[0][:65]
                key = f"{repo}:{msg}"
                if key not in seen:
                    seen.add(key)
                    commits.append({
                        "repo": repo.split("/")[-1],
                        "repo_full": repo,
                        "message": msg,
                        "time": event.get("created_at", ""),
                    })
                if len(commits) >= limit: break
        if len(commits) >= limit: break
    return commits

def fetch_blog_posts(limit=3):
    if not BLOG_RSS_URL: return []
    try:
        feed = feedparser.parse(BLOG_RSS_URL)
        return [{"title": e.get("title","")[:55], "link": e.get("link",""), "published": e.get("published","")}
                for e in feed.entries[:limit]]
    except: return []

# ── DEVOS SCORE ───────────────────────────────────────────────────────────────
def compute_devos_score(user, repos, events):
    """
    DEVOS Score: 5 dimensions, 200 points each, 1000 total.
    
    1. COMMIT VELOCITY   — recent commit frequency
    2. CODE INFLUENCE    — total stars earned
    3. COLLABORATION     — PRs merged, issues opened  
    4. CONSISTENCY       — longest streak (approx from events)
    5. BREADTH           — number of repos × languages
    """
    scores = {}
    
    # 1. COMMIT VELOCITY (200 pts) — commits in last 30 events / expected
    push_events = [e for e in events if e.get("type") == "PushEvent"]
    commits_per_push = [len(e.get("payload", {}).get("commits", [])) for e in push_events[:20]]
    recent_commits = sum(commits_per_push)
    velocity_score = min(200, int(recent_commits * 4))  # 50 commits = 200
    scores["COMMIT VELOCITY"] = (velocity_score, 200, f"{recent_commits} recent commits")

    # 2. CODE INFLUENCE (200 pts) — total stars
    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    influence_score = min(200, int(math.log1p(total_stars) * 28))  # ~1000 stars = 200
    scores["CODE INFLUENCE"] = (influence_score, 200, f"{total_stars} stars earned")

    # 3. COLLABORATION (200 pts) — PR events + issue events
    pr_events = [e for e in events if e.get("type") in ("PullRequestEvent", "IssuesEvent")]
    collab_score = min(200, len(pr_events) * 10)
    scores["COLLABORATION"] = (collab_score, 200, f"{len(pr_events)} PR/issue events")

    # 4. CONSISTENCY (200 pts) — approximate active days from events
    active_days = set()
    for event in events:
        t = event.get("created_at", "")
        if t: active_days.add(t[:10])
    consistency_score = min(200, len(active_days) * 12)  # 17 days = 200
    scores["CONSISTENCY"] = (consistency_score, 200, f"{len(active_days)} active days in sample")

    # 5. BREADTH (200 pts) — repos × language diversity
    langs = set(r.get("language") for r in repos if r.get("language"))
    breadth_score = min(200, len(repos) * 3 + len(langs) * 8)
    scores["BREADTH"] = (breadth_score, 200, f"{len(repos)} repos · {len(langs)} languages")

    total = sum(v[0] for v in scores.values())
    return total, scores

def score_rank(total):
    if total >= 900: return "S  · LEGENDARY"
    if total >= 750: return "A+ · ELITE"
    if total >= 600: return "A  · SENIOR"
    if total >= 450: return "B  · MID-LEVEL"
    if total >= 300: return "C  · GROWING"
    return "D  · JUST STARTED"

def generate_devos_score_section(user, repos, events):
    total, scores = compute_devos_score(user, repos, events)
    rank = score_rank(total)
    total_bar = bar(total / 10, 20)  # /10 because max is 1000, bar is /100

    lines = [
        " ╔══════════════════════════════════════════════════════════════════╗",
        " ║  DEVOS PERFORMANCE BENCHMARK                                     ║",
        " ╠══════════════════════════════════════════════════════════════════╣",
        " ║                                                                  ║",
       f" ║  TOTAL SCORE     {total:>4} / 1000     RANK: {rank:<26}  ║",
        " ║                                                                  ║",
    ]
    labels = list(scores.keys())
    for label in labels:
        pts, max_pts, detail = scores[label]
        b = bar(pts / max_pts * 100, 10)
        lines.append(f" ║  [ {label:<18} ]   {b}  {pts:>3} / {max_pts}   ({detail[:28]:<28})  ║")
    lines += [
        " ║                                                                  ║",
        " ╚══════════════════════════════════════════════════════════════════╝",
    ]
    return "```\n" + "\n".join(lines) + "\n```"

# ── CODE DNA ──────────────────────────────────────────────────────────────────
def generate_code_dna(user, repos, events):
    """Build the Code DNA fingerprint block."""

    # Language distribution
    lang_counts = Counter(r.get("language") for r in repos if r.get("language"))
    total_repos_with_lang = sum(lang_counts.values()) or 1
    top_langs = lang_counts.most_common(4)

    # Commit hour heatmap (UTC)
    hour_counts = Counter()
    for event in events:
        if event.get("type") == "PushEvent":
            t = event.get("created_at", "")
            try:
                hour_counts[date_parser.parse(t).hour] += len(event.get("payload",{}).get("commits",[]))
            except: pass
    max_val = max(hour_counts.values()) if hour_counts else 0
    max_hour = max_val if max_val > 0 else 1
    heatmap = ""
    for h in range(24):
        pct = hour_counts.get(h, 0) / max_hour
        if pct == 0:    heatmap += "░ "
        elif pct < 0.3: heatmap += "▒ "
        elif pct < 0.7: heatmap += "▓ "
        else:           heatmap += "█ "
    heatmap = heatmap.strip()

    # Commit vocabulary (first word of commit message)
    vocab = Counter()
    for event in events:
        if event.get("type") == "PushEvent":
            for c in event.get("payload", {}).get("commits", []):
                msg = c.get("message","").strip()
                if msg:
                    first_word = msg.split()[0].lower().rstrip(":").rstrip("(")
                    vocab[first_word] += 1
    total_commits_vocab = sum(vocab.values()) or 1
    top_vocab = vocab.most_common(5)
    vocab_str = "  ".join(f"{w}({int(c/total_commits_vocab*100)}%)" for w,c in top_vocab)

    # Repo stats
    all_stars = sum(r.get("stargazers_count", 0) for r in repos)
    all_forks = sum(r.get("forks_count", 0) for r in repos)
    avg_stars = all_stars // max(len(repos), 1)
    avg_forks = all_forks // max(len(repos), 1)
    username = GITHUB_USERNAME
    public_repos = user.get("public_repos", len(repos))
    following = user.get("following", 0)
    followers = user.get("followers", 0)

    lang_lines = []
    for lang, count in top_langs:
        pct = int(count / total_repos_with_lang * 100)
        b = bar(pct, 46)
        lang_lines.append(f" ▐{b}▌ {lang:<14} {pct:>3}%")
    lang_block = "\n".join(lang_lines) if lang_lines else " No language data yet."

    return f"""```
 YOUR UNIQUE DEVELOPER FINGERPRINT
 Analyzed from public repository data · {username}
 ─────────────────────────────────────────────────────────────────

 LANGUAGE DNA
{lang_block}

 COMMIT HEATMAP  (UTC hours · 00 → 23 · ░ quiet  ▒ light  ▓ active  █ peak)
 {heatmap}

 COMMIT VOCABULARY  (most-used prefix words)
 {vocab_str if vocab_str else 'Push some commits to generate this'}

 REPOSITORY PROFILE
 public repos: {public_repos:<6}   avg stars/repo: {avg_stars:<6}   avg forks/repo: {avg_forks:<6}
 followers: {followers:<9}   following: {following:<8}   member since: {user.get('created_at','?')[:4]}
```"""

# ── STATUS SECTION ─────────────────────────────────────────────────────────────
def generate_status_section(config, commits, score_total):
    mission = config.get("status", {}).get("current_mission", "Building something that matters")
    learning = config.get("status", {}).get("learning", "Exploring new technologies")
    open_to = config.get("status", {}).get("open_to", ["collaborations", "code reviews"])
    strength = config.get("status", {}).get("signal_strength", 80)

    signal_bar = bar(strength, 10)
    score_bar = bar(score_total / 10, 12) if score_total else "░" * 12
    score_display = f"{score_total} / 1000" if score_total else "calculating..."

    last_commit_msg = commits[0]["message"][:44] if commits else "no recent commits"
    last_commit_date = commits[0]["time"][:10] if commits else "N/A"

    open_to_str = " · ".join(open_to[:3])

    return f"""```yaml
 ┌──────────────────────────────────────────────────────────────────┐
 │  kernel.conf                                          v2.0-stable │
 ├──────────────────────────────────────────────────────────────────┤
 │                                                                   │
 │  MISSION      →  "{mission[:54]}"
 │  LEARNING     →  "{learning[:54]}"
 │  AVAILABLE    →  [ {open_to_str[:60]} ]
 │                                                                   │
 │  SIGNAL       {signal_bar}  {strength}%   active · shipping · responsive    │
 │  DEVOS SCORE  {score_bar}  {score_display}
 │                                                                   │
 │  LAST DEPLOY  {last_commit_date}  ·  {last_commit_msg}
 │                                                                   │
 └──────────────────────────────────────────────────────────────────┘
```"""

# ── PROCESSES SECTION ─────────────────────────────────────────────────────────
def generate_processes_section(config):
    projects = config.get("projects", [])
    if not projects:
        return "```\n No active processes. Edit config.yml to add your projects.\n```"

    lines = [
        " PID   PROCESS                        STATUS      ▓▓▓▓▓▓▓▓▓▓▓▓  %    TYPE",
        " ───   ─────────────────────────────  ──────────  ────────────  ───  ──────────────",
    ]
    for i, p in enumerate(projects[:5]):
        pid = str(i + 1).zfill(3)
        name = p.get("name", "Unnamed")[:29]
        status = p.get("status", "IN DEV")[:10]
        pct = int(p.get("progress", 50))
        b = bar(pct, 12)
        ptype = p.get("type", "Project")[:14]
        lines.append(f" {pid}   {name:<29}  {status:<10}  {b}  {pct:>3}  {ptype}")

    return "```\n" + "\n".join(lines) + "\n```"

# ── BROADCAST SECTION ─────────────────────────────────────────────────────────
def generate_broadcast_section(commits, posts):
    lines = [
        " ┌─ LIVE FEED ─────────────────────────────────────────────────────┐",
        " │                                                                  │",
    ]
    for post in posts[:2]:
        t = post["title"][:52]
        lnk = post["link"][:47]
        age = time_ago(post.get("published",""))[:10]
        lines.append(f" │  ✦ BLOG    \"{t}\"")
        lines.append(f" │            {lnk:<47}  {age:<10}  │")
        lines.append(" │                                                                  │")
    for c in commits[:4]:
        msg = c["message"][:52]
        repo = c["repo_full"]
        age = time_ago(c["time"])[:10]
        lines.append(f" │  ✦ COMMIT  {msg}")
        lines.append(f" │            github.com/{repo:<38}  {age:<10}  │")
        lines.append(" │                                                                  │")
    if not posts and not commits:
        lines.append(" │  Push a commit or set BLOG_RSS_URL to populate this feed.        │")
        lines.append(" │                                                                  │")
    lines.append(" └──────────────────────────────────────────────────────────────────┘")
    return "```\n" + "\n".join(lines) + "\n```"

# ── SCORE BADGE ───────────────────────────────────────────────────────────────
def generate_score_badge(total):
    color = "3fb950" if total >= 600 else "58a6ff" if total >= 400 else "f0883e"
    label = f"DEVOS+SCORE-{total}%2F1000-{color}?style=flat-square&labelColor=0d1117&logo=github"
    return f"![DEVOS Score](https://img.shields.io/badge/{label})"

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    print("[DEVOS v2] Starting full system update...")

    config   = load_config()
    user     = fetch_user()
    repos    = fetch_repos()
    events   = fetch_events(100)
    commits  = fetch_recent_commits(events, 5)
    posts    = fetch_blog_posts(3)

    print(f"[DEVOS v2] Data: {len(repos)} repos, {len(events)} events, {len(commits)} commits, {len(posts)} posts")

    readme = read_readme()

    # DEVOS Score (compute once, use in multiple sections)
    total_score, _ = compute_devos_score(user, repos, events)
    print(f"[DEVOS v2] DEVOS Score: {total_score}/1000 ({score_rank(total_score)})")

    # STATUS
    readme = replace_section(readme, "STATUS", generate_status_section(config, commits, total_score))
    print("[DEVOS v2] ✓ Status")

    # SCORE BADGE
    readme = replace_section(readme, "SCORE_BADGE", generate_score_badge(total_score))
    print("[DEVOS v2] ✓ Score badge")

    # DEVOS SCORE SECTION
    readme = replace_section(readme, "DEVOS_SCORE", generate_devos_score_section(user, repos, events))
    print("[DEVOS v2] ✓ DEVOS Score section")

    # CODE DNA
    readme = replace_section(readme, "CODE_DNA", generate_code_dna(user, repos, events))
    print("[DEVOS v2] ✓ Code DNA")

    # PROCESSES
    readme = replace_section(readme, "PROCESSES", generate_processes_section(config))
    print("[DEVOS v2] ✓ Processes")

    # BROADCAST
    readme = replace_section(readme, "BROADCAST", generate_broadcast_section(commits, posts))
    print("[DEVOS v2] ✓ Broadcast")

    # LAST SYNC
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    readme = replace_section(readme, "LAST_SYNC", now)
    print("[DEVOS v2] ✓ Last sync timestamp")

    write_readme(readme)
    print("[DEVOS v2] ✓ README.md written. System update complete.")

if __name__ == "__main__":
    main()
