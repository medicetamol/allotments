# allotments

Data for the mediCetamol seat-allotment page (`/allotment/` on the main site).
Served by GitHub Pages: `https://medicetamol.github.io/allotments/`

```
app.js                 the allotment tool (loaded by the /allotment page of the main site)
app.css                its styles (every rule is scoped to #al-root)
colleges.json          master list of colleges (one entry per real college, shared by every round)
rounds/index.json      list of rounds shown in the page's dropdown
rounds/<year>-r<n>.json  one file per round (schema v4)
```

The main site (React) only has a small page, `src/pages/Allotments.tsx`, that loads `app.js` and `app.css`
from this repo. To change how the tool works, edit `app.js` / `app.css` here and push. GitHub Pages
caches files for about 10 minutes. `app.js` finds `colleges.json` and `rounds/` next to itself, so nothing
needs to change when the site moves to a custom domain.

## Exams
`rounds/index.json` entries carry an `"exam"` (`"NEET-PG"` or `"WB-PG"`). The page groups its round dropdown by
exam, and uses the round file's `meta.exam` for wording (NEET-PG rank = all-India rank, other exams = rank in that
counselling's merit list). West Bengal files use their own quotas (Open Quota, Private Management Quota,
In-service Quota, In-service DNB Quota, NRI Quota) and categories (OBC-A, OBC-B); the page builds its category
columns from the categories found in the round file.

## Add a new round
1. Add `rounds/<year>-r<n>.json`.
2. Add one entry to `rounds/index.json` (set `default` if it should open first).
3. If the round has colleges that are not in `colleges.json`, APPEND them there (see rules below).

## `colleges.json` (v3)
```json
{ "v": 3, "updated": "2026-10-27",
  "states":   { "WB": "West Bengal", "DL": "Delhi", "...": "..." },
  "colleges": { "RGKWB": ["RG Kar Medical College", "Kolkata", "WB"] } }
```
- Key = college code = 3 letters from the name + 2-letter vehicle state code (e.g. `RGKWB`, `SMSRJ`).
- Value = `[name, city, stateCode]`. The state is stored explicitly, so a wrong state can be fixed without
  changing the code.
- Rules: a code NEVER changes once released. Names, cities and states can be corrected. New colleges
  are only added (new, unique code). Never reuse a code for another college.

## `rounds/<id>.json` (v4)
```json
{ "v": 4,
  "meta":    { "id": "2026-r1", "label": "NEET-PG 2026 · Round 1", "exam": "NEET-PG", "year": 2026, "round": 1,
               "total": 28723, "source": "...", "updated": "2026-10-23" },
  "quotas":  ["All India", "DNB Quota", "..."],
  "cats":    ["Open", "OBC", "EWS", "SC", "ST", "Open PwD", "..."],        // seat category allotted
  "ccats":   ["General", "OBC", "EWS", "SC", "ST", "General PwD", "..."],   // candidate's own category
  "courses": [["MD", "General Medicine"], ["DNB", "Anaesthesiology"]],       // [course type, branch]
  "rows":    [[rank, quotaIdx, "RGKWB", courseIdx, catIdx, ccatIdx]] }       // sorted by rank
```
Round 2 and later files hold only the seats allotted in that round (fresh allotments and upgrades).
Course names: Radio-Diagnosis is "Radiology" and ENT / Otorhinolaryngology is "ENT".
Quota "Armed Forces Medical" (Round 2, 2025) counts as a Government seat type in the page.
