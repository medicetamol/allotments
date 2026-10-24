# allotments

Data for the mediCetamol seat-allotment page (`/allotment/` on the main site).
Served by GitHub Pages at `https://medicetamol.github.io/allotments/rounds/`.

## Add a new round or year
1. Drop the new file in `rounds/` (e.g. `2026-r2.json`).
2. Add one entry to `rounds/index.json` (and set `default` if it should open first).

## `rounds/index.json`
```json
{ "v": 1, "default": "2026-r1",
  "rounds": [ { "id": "2026-r1", "label": "NEET-PG 2026 · Round 1", "year": 2026, "round": 1, "file": "2026-r1.json" } ] }
```

## `rounds/<id>.json` (schema v3)
Lookup tables are lists; every row stores only indexes into them, which keeps the file small.
```json
{
  "v": 3,
  "meta":    { "id": "2026-r1", "label": "NEET-PG 2026 · Round 1", "exam": "NEET-PG", "year": 2026, "round": 1,
               "total": 28723, "source": "...", "updated": "2026-10-23" },
  "quotas":  ["All India", "DNB Quota", "..."],
  "states":  ["Delhi", "Tamil Nadu", "..."],
  "cats":    ["Open", "OBC", "EWS", "SC", "ST", "Open PwD", "..."],      // seat category allotted
  "ccats":   ["General", "OBC", "EWS", "SC", "ST", "General PwD", "..."], // candidate's own category
  "courses": [["MD", "General Medicine"], ["MS", "General Surgery"], ["DNB", "Anaesthesiology"]],  // [course type, branch]
  "insts":   [["College name (no city or state)", "City", stateIdx]],
  "rows":    [[rank, quotaIdx, instIdx, courseIdx, catIdx, ccatIdx]]       // sorted by rank, ascending
}
```
Rules: `rank` is an integer; the five row indexes point into `quotas`, `insts`, `courses`, `cats`, `ccats`
(0-based); `stateIdx` points into `states`. `city` may be an empty string. The page builds its own labels
("Name, City" when a state is chosen, "Name, State" otherwise). Course types in use:
`MD, MS, DNB, DrNB (6-yr), M.Ch, DNB Diploma, Diploma`. Older v1/v2 files still load.
