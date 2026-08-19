# Jordan Beetdiggers Football

Schedule, game film, and scouting analytics for Jordan High School football.

Live at **[jordan-football-app.vercel.app](https://jordan-football-app.vercel.app)**

## What it does

- **Schedule** — the season schedule with results and region games, public.
- **Scouting reports** — per-opponent tendencies and a game plan card, built from
  charted Hudl film imported out of Excel. Uses *pre-game* film only: film from the
  actual head-to-head matchup is tagged and excluded so advance scouting stays honest.
- **Team Analytics** — Jordan's own self-scout: offensive and defensive efficiency
  dashboards plus a game-by-game season dashboard. Private, coaches only.
- **Live tendencies** — pick down, distance, and field position on the sideline and
  get the opponent's most likely call from their charted film.
- **Film** — video uploaded straight from the browser to Cloudflare R2 and played back
  on the opponent and game pages.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Auth.js · Cloudflare R2 · Vercel

## Running locally

```bash
npm install
cp .env.example .env   # then fill in the values
npx prisma db push     # create the tables
npm run dev
```

Create the single coach/admin login:

```bash
npm run create-admin -- you@example.com "a strong password"
```

## Importing charted film

Two Excel formats are auto-detected on upload:

| Workbook | Sheets read | Where to upload |
| --- | --- | --- |
| Opponent scouting | `Opp Offense Log`, `Opp Defense Log`, `Opp Special Teams Log` | An opponent's Manage page |
| Self-scout ("Team Analytics") | `Offense Play-by-Play`, `Defense Play-by-Play`, `Special Teams Log` | A specific game's chart/film page |

Columns are matched by header name, so reordering the sheet is fine. The workbook's
`(auto)` columns — success, explosive, down & distance, field zone — are skipped and
recomputed in `src/lib/analytics.ts`, which ports the spreadsheet's own formulas
(1st down success = 50% of distance, 2nd = 70%, 3rd/4th = 100%; explosive = 10+ yard
run or 15+ yard pass).

## Tests

```bash
npm test
```

The analytics tests check the computed tendencies against real charted workbooks, so
the numbers on the site match what the spreadsheet already produces.
