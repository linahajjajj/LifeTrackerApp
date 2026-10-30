# Lina's Life Book

Personal trackers app: Today (prayers, tasbih, habits), Money, Health, Home (kitchen, closet, people, notes).
Plain static web app. No build step.

## Folders
| Path | What |
|---|---|
| `site/` | The web app. This folder is what gets deployed. |
| `site/index.html` | Screens (markup) |
| `site/css/app.css` | All styles |
| `site/js/app.js` | App logic |
| `site/js/runtime.js` | Data, photos, AI and downloads layer (`window.claude.use(...)`). Today: IndexedDB on the device. Next: Supabase. |
| `site/sw.js` | Service worker (offline, photo links). **Bump `VERSION` on every release.** |
| `worker/lina-ai.js` | Cloudflare Worker that calls the Claude API (key stays in Cloudflare secrets) |
| `docs/schema.md` | Supabase tables and relations |

## Run locally
```
cd site && python3 -m http.server 8080
```
Open http://localhost:8080

## History
- Version 35 came from the Claude artifact "Lina's Life Book" (frozen 30 Oct 2026; don't edit it any more).
- From now on this repo is the master copy.
