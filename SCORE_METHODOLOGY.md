# DEVOS Score — Methodology

Your DEVOS Score is a **1000-point composite metric** computed from real public GitHub data. It's designed to measure developer momentum, not seniority — a new developer shipping consistently can score higher than a senior developer who's been quiet.

## The 5 Dimensions

### 1. Commit Velocity (200 pts)
> *Are you actively shipping?*

Measures recent commit frequency from your public push events. Scoring is logarithmic — frequent shippers are rewarded, but diminishing returns prevent gaming.

- ~50 commits in the sample window → full 200 pts
- ~25 commits → ~140 pts
- ~10 commits → ~90 pts

**To improve:** Ship small, ship often. Break big tasks into commitable units.

---

### 2. Code Influence (200 pts)
> *Does your work resonate with others?*

Total GitHub stars earned across all your public repositories. Uses `log(1 + stars)` scaling to prevent one viral repo from dominating.

- ~1,000 total stars → full 200 pts
- ~100 stars → ~130 pts
- ~10 stars → ~65 pts

**To improve:** Write READMEs that explain the "why" clearly. Share your work publicly.

---

### 3. Collaboration (200 pts)
> *Do you work with others?*

Counts PR events and issue events in your recent public activity. Opening issues, reviewing PRs, contributing to discussions.

- ~20 PR/issue events in sample → full 200 pts

**To improve:** Contribute to open source. Review others' code. Engage on issues.

---

### 4. Consistency (200 pts)
> *Do you show up?*

Active unique days in your recent event sample. A streak of active days, even small commits, scores well.

- ~17 unique active days in sample → full 200 pts

**To improve:** Commit something — anything — daily. Document your learning publicly.

---

### 5. Breadth (200 pts)
> *How wide is your reach?*

Number of public repositories × language diversity. Rewards developers who ship across domains and tools.

- `(repos × 3) + (languages × 8)` capped at 200
- 30 repos in 8 languages → 170 pts

**To improve:** Start more repos (even small experiments count). Branch into new languages.

---

## Score Tiers

| Score    | Rank           | Description                    |
|----------|----------------|--------------------------------|
| 900-1000 | S · LEGENDARY  | Consistently exceptional output |
| 750-899  | A+ · ELITE     | High-output, high-influence      |
| 600-749  | A · SENIOR     | Solid, active, well-rounded      |
| 450-599  | B · MID-LEVEL  | Good momentum, room to grow      |
| 300-449  | C · GROWING    | Early stages, keep going         |
| 0-299    | D · JUST STARTED | New to GitHub or mostly private  |

---

## Important Notes

- Score is based on **public** activity only. Private repos don't count.
- The sample window is GitHub's public events API (~last 100 events).
- Scores are meant to measure **momentum**, not judge seniority.
- A new developer pushing every day can outscore a senior dev who's been quiet.
- Gaming is possible but pointless — the score is for your own profile, not a competition.

---

## Updates

Score recalculates every 24h via GitHub Actions. To force a recalculation: go to Actions → "DEVOS — Auto Update README" → Run workflow.
