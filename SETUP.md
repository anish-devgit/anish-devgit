# ◈ FORGE — Setup Guide
## *From fork to live profile in under 5 minutes*

---

## What is FORGE?

**FORGE** is not just a README template. It's a **Developer Identity Engine** that:

- 🧬 **Classifies your Developer Archetype** — one of 16 personas based on your actual GitHub behavior
- 📡 **Generates your Developer Pulse** — a unique animated waveform of your contribution history
- ⚡ **Auto-updates daily** via GitHub Actions — zero manual maintenance
- 🎨 **6 visual themes** — or build your own color palette
- 🏆 **FORGE Karma score** — a richer metric than just stars

---

## Quickstart (5 minutes)

### Step 1 — Fork this repository

Click the **Fork** button at the top of this page.

> **Critical:** The forked repo must be named **exactly** `your-github-username` (your GitHub username).
> That's how GitHub profile READMEs work — the repo name must match your username.

```
Repository name: your-github-username   ✓
Repository name: FORGE                  ✗ (won't appear on your profile)
```

### Step 2 — Create a GitHub Personal Access Token

1. Go to **GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Name it: `FORGE_TOKEN`
4. Select scopes: ✅ `read:user` ✅ `repo` ✅ `read:org`
5. Copy the token — you'll need it in Step 3

### Step 3 — Add the token to your repository secrets

1. In your forked repository, go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `FORGE_TOKEN`
4. Value: paste the token from Step 2

### Step 4 — Configure your identity

Edit `config/forge.yml` and fill in your details:

```yaml
identity:
  github_username: "your-actual-username"   # Change this!
  name: "Your Real Name"
  tagline: "Your one-line developer philosophy"
  timezone: "America/New_York"              # For commit-time analysis

status:
  availability: "open_to_collaborate"       # See options below
  current_mission: "What you're building right now"

theme:
  preset: "cyberpunk"                       # cyberpunk | terminal | arctic | solarflare | obsidian | aurora
```

**Availability options:**
- `open_to_collaborate` — 🟢 Green dot, welcoming collaborators
- `deep_work` — 🔴 Red dot, heads down on something
- `exploring` — 🟡 Yellow dot, in learning mode
- `on_leave` — ⚫ Black dot, taking a break

### Step 5 — Trigger your first build

1. Go to **Actions** tab in your repository
2. Click **"FORGE — Update Developer Identity"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait ~60 seconds for the magic to happen
5. Refresh your GitHub profile page

**You're done.** FORGE will now auto-update your profile every day at midnight UTC.

---

## Customization Guide

### Themes

| Theme | Primary | Secondary | Vibe |
|:------|:--------|:----------|:-----|
| `cyberpunk` | `#00FF9F` | `#BD00FF` | Neon hacker |
| `terminal` | `#33FF33` | `#FF8C00` | Classic green terminal |
| `arctic` | `#A8D8EA` | `#F4A261` | Clean and icy |
| `solarflare` | `#FF6B35` | `#FFD700` | Warm and intense |
| `obsidian` | `#C9B8FF` | `#FF79C6` | Deep purple night |
| `aurora` | `#00FFDD` | `#FF00A0` | Northern lights |

Or define your own colors:

```yaml
theme:
  preset: "cyberpunk"     # Base preset (for anything not overridden)
  accent_primary: "#FF0080"
  accent_secondary: "#00FFFF"
  background: "#050505"
```

### Developer Archetype

FORGE automatically classifies you into one of 16 archetypes:

| Sigil | Archetype | Identity |
|:------|:----------|:---------|
| ◈ | The Architect | Designs systems, thinks in layers |
| ⚒ | The Craftsman | High commit frequency, quality obsession |
| ◎ | The Explorer | Many languages, broad experiments |
| ▣ | The Operator | Consistent execution, reliability |
| ⊕ | The Educator | Great docs, community teacher |
| ◐ | The Night Owl | Peak productivity after midnight |
| ⬡ | The Polyglot | 5+ languages used meaningfully |
| ◆ | The Specialist | Unreasonable depth in one domain |
| ⬢ | The Maintainer | Long-lived repos, community trust |
| ⟫ | The Sprinter | Burst contributor, hackathon energy |
| ✦ | The Open Sourcerer | More PRs to others than self |
| ▲ | The Pioneer | Early adopter of now-trending tech |
| ⊗ | The Researcher | Rigorous, academic approach |
| □ | The Builder | Ships full products, real users |
| ◇ | The Phantom | Low public output, high quality |
| ◉ | The Connector | Community hub, network builder |

The archetype updates automatically as your GitHub behavior evolves over time.

---

## Frequently Asked Questions

**Q: Will this work with a private GitHub profile?**  
A: FORGE uses your public GitHub data. Private repos won't be analyzed, but your public activity will still generate a great profile.

**Q: How often does it update?**  
A: Daily at midnight UTC by default. You can change the cron schedule in `.github/workflows/forge_update.yml`.

**Q: Can I manually trigger an update?**  
A: Yes. Go to Actions → FORGE — Update Developer Identity → Run workflow.

**Q: My archetype seems wrong. Can I override it?**  
A: Not yet — but archetype overrides are on the roadmap. The algorithm improves as your activity history grows.

**Q: Does FORGE store my data anywhere?**  
A: No. All data fetching and processing happens inside your own GitHub Actions runner. Nothing is sent to external servers.

**Q: Can I add custom sections to the README?**  
A: Yes! Edit the template in `scripts/generate_readme.py`. Sections marked with `## \`> YOUR_SECTION\`` follow the FORGE aesthetic pattern.

---

## Roadmap

- [ ] **Archetype manual override** in forge.yml
- [ ] **FORGE Network** — link profiles of collaborators with mutual badge
- [ ] **Time-lapse mode** — show archetype evolution over years
- [ ] **Spotify "Now Playing"** integration
- [ ] **WakaTime** coding hours integration
- [ ] **Blog post auto-fetch** (RSS feed → Mission Log)
- [ ] **FORGE CLI** — `npx forge-init` to set up in seconds
- [ ] **Discord status sync** — auto-update Discord status from FORGE status
- [ ] **Weekly digest email** — get your FORGE stats in your inbox
- [ ] **Leaderboard** — opt-in FORGE Karma ranking across all users

---

## Contributing

FORGE is open source and welcomes contributions.

1. Fork this repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes and test locally: `python scripts/generate_readme.py`
4. Open a PR with a clear description

**High-value contributions:**
- New archetype definitions
- New theme presets
- Improved archetype classification algorithm
- New visualization types for the pulse
- Integrations (WakaTime, Spotify, RSS)

---

## License

MIT — do anything you want with this. Attribution appreciated but not required.

---

<div align="center">

*FORGE — Because your GitHub profile should be as impressive as your code.*

**[⭐ Star this repo](https://github.com/your-username/FORGE)** to support the project

</div>
