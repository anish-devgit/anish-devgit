#!/usr/bin/env python3
"""
DEVOS v2 — AI Visitor Terminal
The key innovation: when a visitor opens an Issue with !ask [question],
this script calls Claude with a system prompt built from config.yml,
so Claude responds AS the developer — in their voice, with their context.

Also handles: !ping, !collab, !review, !roast
"""

import os, re, json, yaml, requests
from datetime import datetime, timezone

# ── ENV ────────────────────────────────────────────────────────────────────────
GITHUB_TOKEN    = os.environ.get("GITHUB_TOKEN", "")
GITHUB_USERNAME = os.environ.get("GITHUB_USERNAME", "")
ANTHROPIC_KEY   = os.environ.get("ANTHROPIC_API_KEY", "")

VISITOR_AUTHOR  = os.environ.get("VISITOR_AUTHOR", "visitor")
VISITOR_COMMAND = os.environ.get("VISITOR_COMMAND", "!ping")
VISITOR_MESSAGE = os.environ.get("VISITOR_MESSAGE", "")
ISSUE_NUMBER    = int(os.environ.get("ISSUE_NUMBER", "0"))

README_PATH     = "README.md"
CONFIG_PATH     = "config.yml"
MAX_LOG_ROWS    = 8

# ── HELPERS ────────────────────────────────────────────────────────────────────
def read_readme():
    with open(README_PATH, "r", encoding="utf-8") as f: return f.read()

def write_readme(content):
    with open(README_PATH, "w", encoding="utf-8") as f: f.write(content)

def replace_section(content, section_name, new_content):
    pattern = rf"(<!-- DYNAMIC:{section_name}_START -->)(.*?)(<!-- DYNAMIC:{section_name}_END -->)"
    return re.sub(pattern, rf"\1\n{new_content}\n\3", content, flags=re.DOTALL)

def load_config():
    try:
        with open(CONFIG_PATH, "r") as f: return yaml.safe_load(f) or {}
    except: return {}

def post_github_comment(body):
    if not GITHUB_TOKEN or not ISSUE_NUMBER: return
    url = f"https://api.github.com/repos/{GITHUB_USERNAME}/{GITHUB_USERNAME}/issues/{ISSUE_NUMBER}/comments"
    requests.post(url, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }, json={"body": body})

def close_github_issue():
    if not GITHUB_TOKEN or not ISSUE_NUMBER: return
    url = f"https://api.github.com/repos/{GITHUB_USERNAME}/{GITHUB_USERNAME}/issues/{ISSUE_NUMBER}"
    requests.patch(url, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }, json={"state": "closed"})

# ── CLAUDE AI CALL ─────────────────────────────────────────────────────────────
def build_system_prompt(config):
    """Build a system prompt that makes Claude sound like the developer."""
    identity = config.get("identity", {})
    status   = config.get("status", {})
    projects = config.get("projects", [])
    skills   = config.get("skills", [])

    name        = identity.get("display_name", GITHUB_USERNAME)
    mission     = status.get("current_mission", "building interesting software")
    learning    = status.get("learning", "new technologies")
    open_to     = status.get("open_to", ["collaborations"])
    tagline     = identity.get("tagline", "")

    proj_lines = "\n".join([
        f"  - {p.get('name','?')} ({p.get('status','?')}, {p.get('progress',0)}% done): {p.get('description','')}"
        for p in projects[:5]
    ])
    skill_lines = ", ".join([f"{s.get('name','?')} ({s.get('level','?')})" for s in skills[:8]])

    return f"""You are {name} (GitHub: @{GITHUB_USERNAME}), a software developer.
Someone has visited your GitHub profile and asked you a question via the DEVOS Visitor Terminal.
Respond AS {name} — in first person, authentically, like a developer would on GitHub.

YOUR CONTEXT:
- Current mission: {mission}
- Currently learning: {learning}
- Open to: {', '.join(open_to)}
- Tagline: {tagline}

YOUR ACTIVE PROJECTS:
{proj_lines if proj_lines else '  (update config.yml to add projects)'}

YOUR TECH STACK:
  {skill_lines if skill_lines else '(update config.yml to add skills)'}

TONE: Conversational, technical, genuine. Not corporate. Not overly enthusiastic.
Like a developer talking to another developer. Use first person naturally.
Keep it concise — 3-6 sentences max unless the question genuinely requires more.
Feel free to be a bit dry or witty if it fits the question.
Do NOT start with "Great question!" or similar. Just answer.
End with a line break and a brief invitation to keep the conversation going or check out a relevant project.
Format as plain markdown suitable for a GitHub issue comment."""

def call_claude(system_prompt, user_question):
    """Call Claude API and return the response text."""
    if not ANTHROPIC_KEY:
        return None

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 400,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": f"Question from a GitHub visitor: {user_question}"}
        ]
    }

    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
            timeout=30
        )
        if r.status_code == 200:
            data = r.json()
            return data["content"][0]["text"]
    except Exception as e:
        print(f"[DEVOS] Claude API error: {e}")
    return None

def call_claude_roast(system_prompt, repos):
    """Special roast mode — Claude roasts the developer's own GitHub."""
    repo_names = [r.get("name","") for r in repos[:10]]
    repo_list = ", ".join(repo_names)
    
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 350,
        "system": system_prompt + "\n\nSpecial mode: SELF ROAST. You are now roasting your own GitHub profile. Be self-deprecating, genuinely funny, and specific to your own repos/patterns. Developers love this.",
        "messages": [
            {"role": "user", "content": f"Roast your own GitHub! Your repos: {repo_list}. Be funny and self-aware. 4-6 lines max."}
        ]
    }
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
            timeout=30
        )
        if r.status_code == 200:
            return r.json()["content"][0]["text"]
    except: pass
    return None

# ── README AI LOG UPDATE ──────────────────────────────────────────────────────
def update_ai_log(readme, command, author, message, ai_response):
    """Update both the AI exchanges table and visitor log in the AI_LOG section."""
    pattern = r"(<!-- DYNAMIC:AI_LOG_START -->)(.*?)(<!-- DYNAMIC:AI_LOG_END -->)"
    match = re.search(pattern, readme, re.DOTALL)
    if not match:
        return readme

    existing_content = match.group(2)

    # Parse existing AI exchange rows
    ai_table_match = re.search(r"\| TIME.*?ASKED.*?\n(\|[-|]+\|)\n((?:\|.*\n?)*)", existing_content)
    ai_rows = []
    if ai_table_match:
        for line in ai_table_match.group(2).strip().split("\n"):
            parts = [p.strip() for p in line.strip("|").split("|")]
            if len(parts) >= 4 and not all(p == "" for p in parts):
                # Skip placeholder rows
                if "waiting for visitors" not in parts[1] and "be the first" not in parts[2]:
                    ai_rows.append(parts)

    # Parse existing visitor rows
    vis_table_match = re.search(r"\| TIME.*?HANDLE.*?COMMAND.*?\n(\|[-|]+\|)\n((?:\|.*\n?)*)", existing_content)
    vis_rows = []
    if vis_table_match:
        for line in vis_table_match.group(2).strip().split("\n"):
            parts = [p.strip() for p in line.strip("|").split("|")]
            if len(parts) >= 4 and "this could be you" not in line:
                vis_rows.append(parts)

    now = "just now"
    short_msg = (message[:38] + "...") if len(message) > 38 else message
    short_msg = short_msg.replace("|", "/").replace("\n", " ")

    # Add to visitor log
    vis_rows = [[now, f"@{author}", f"`{command}`", f"*{short_msg}*"]] + vis_rows
    vis_rows = vis_rows[:MAX_LOG_ROWS]

    # Add to AI exchanges if it was an !ask
    if command == "!ask" and ai_response:
        short_q = (message[:40] + "...") if len(message) > 40 else message
        short_q = short_q.replace("|", "/").replace("\n"," ")
        ai_rows = [[now, f"@{author}", f"*{short_q}*", "✓ replied"]] + ai_rows
        ai_rows = ai_rows[:6]

    # Rebuild AI exchanges table
    def fmt_ai_table(rows):
        h = "| TIME          | FROM                    | ASKED                                    | STATUS      |"
        s = "|---------------|-------------------------|------------------------------------------|-------------|"
        lines = [h, s]
        if not rows:
            lines.append("| `recently`    | *waiting for visitors*  | *be the first to ask something*          | `PENDING`   |")
        for r in rows:
            t = r[0][:13] if r else "recently"
            f = r[1][:23] if len(r)>1 else ""
            a = r[2][:40] if len(r)>2 else ""
            s2 = r[3][:11] if len(r)>3 else ""
            lines.append(f"| `{t:<13}` | {f:<23} | {a:<40} | `{s2:<11}` |")
        return "\n".join(lines)

    def fmt_vis_table(rows):
        h = "| TIME          | HANDLE                  | COMMAND    | NOTE                               |"
        s = "|---------------|-------------------------|------------|------------------------------------|"
        lines = [h, s]
        if not rows:
            lines.append("| `recently`    | *this could be you*     | `!ping`    | *open an issue to leave your mark* |")
        for r in rows:
            t = r[0][:13] if r else "recently"
            hd = r[1][:23] if len(r)>1 else ""
            cm = r[2][:10] if len(r)>2 else ""
            nt = r[3][:34] if len(r)>3 else ""
            lines.append(f"| `{t:<13}` | {hd:<23} | {cm:<10} | {nt:<34} |")
        return "\n".join(lines)

    new_log = f"""
**`// RECENT EXCHANGES`**

{fmt_ai_table(ai_rows)}

<br>

**`// VISITOR LOG`**

{fmt_vis_table(vis_rows)}

*Auto-updated by GitHub Actions · powered by Claude AI*"""

    return re.sub(pattern, rf"\1\n{new_log}\n\3", readme, flags=re.DOTALL)

# ── GITHUB COMMENT FORMATTERS ─────────────────────────────────────────────────
def format_ping_reply():
    return f"""Signal received! 👋

Your handle has been logged in the DEVOS Visitor Terminal on my GitHub profile. Thanks for stopping by.

\`\`\`
[DEVOS] PING_ACK ✓ — @{VISITOR_AUTHOR} logged at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
\`\`\`

Feel free to `!ask` anything dev-related or `!collab` if you have an idea. The AI terminal is powered by Claude and responds in my voice."""

def format_ask_reply(ai_response, question):
    if ai_response:
        return f"""**Q:** *{question}*

---

{ai_response}

---
<sub>This response was generated by Claude AI using my `config.yml` as context — it reflects my actual projects, stack, and perspective. · [DEVOS AI Terminal](https://github.com/{GITHUB_USERNAME}/{GITHUB_USERNAME})</sub>"""
    else:
        return f"""Hey @{VISITOR_AUTHOR} — thanks for asking! 

*(AI response unavailable — ANTHROPIC_API_KEY may not be configured. Check [SETUP.md](SETUP.md))*

Feel free to reach out directly via the links in my profile."""

def format_collab_reply():
    idea = VISITOR_MESSAGE or "your collaboration idea"
    return f"""Hey @{VISITOR_AUTHOR}! 🤝

Collaboration request logged. I'll review your proposal and reach out directly.

**Idea noted:** *{idea[:200]}*

\`\`\`
[DEVOS] COLLAB_REQUEST ✓ — queued for review
\`\`\`

In the meantime, feel free to check out my active projects in the profile README and drop a more detailed proposal via email or DM."""

def format_review_reply():
    return f"""Hey @{VISITOR_AUTHOR}! 🔍

Code review request received.

Drop the repo URL in a comment here and I'll take a look when I have a slot. Include:
- What you want reviewed (specific PR, file, or general architecture)
- What you're unsure about

\`\`\`
[DEVOS] REVIEW_REQUEST ✓ — queued
\`\`\`"""

def format_roast_reply(roast):
    if roast:
        return f"""@{VISITOR_AUTHOR} asked me to roast myself. Brave. Here goes:

---

{roast}

---
<sub>Self-roast generated by Claude AI. Accurate. · [DEVOS](https://github.com/{GITHUB_USERNAME}/{GITHUB_USERNAME})</sub>"""
    return f"You asked for a roast, @{VISITOR_AUTHOR}. Configure `ANTHROPIC_API_KEY` to enable the AI terminal and I'll deliver. 🔥"

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    print(f"[DEVOS] Processing: {VISITOR_COMMAND} from @{VISITOR_AUTHOR}")
    config = load_config()
    system_prompt = build_system_prompt(config)

    ai_response = None
    comment_body = ""

    if VISITOR_COMMAND == "!ping":
        comment_body = format_ping_reply()

    elif VISITOR_COMMAND == "!ask":
        question = VISITOR_MESSAGE or "what are you working on?"
        print(f"[DEVOS] Calling Claude for !ask: {question[:60]}...")
        ai_response = call_claude(system_prompt, question)
        comment_body = format_ask_reply(ai_response, question)

    elif VISITOR_COMMAND == "!collab":
        comment_body = format_collab_reply()

    elif VISITOR_COMMAND == "!review":
        comment_body = format_review_reply()

    elif VISITOR_COMMAND == "!roast":
        print("[DEVOS] Calling Claude for !roast...")
        try:
            gh_headers = {"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}
            repos_r = requests.get(f"https://api.github.com/users/{GITHUB_USERNAME}/repos?per_page=20", headers=gh_headers)
            repos = repos_r.json() if repos_r.status_code == 200 else []
        except: repos = []
        roast = call_claude_roast(system_prompt, repos)
        comment_body = format_roast_reply(roast)

    # Post comment and close issue
    if comment_body:
        post_github_comment(comment_body)
        print("[DEVOS] ✓ Comment posted")

    close_github_issue()
    print("[DEVOS] ✓ Issue closed")

    # Update README AI log
    readme = read_readme()
    readme = update_ai_log(readme, VISITOR_COMMAND, VISITOR_AUTHOR, VISITOR_MESSAGE, ai_response)
    write_readme(readme)
    print("[DEVOS] ✓ AI log updated in README")

if __name__ == "__main__":
    main()
