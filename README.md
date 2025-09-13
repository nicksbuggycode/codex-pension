Pension Projection SPA
======================

This is a simple, responsive single-page web app that estimates a US federal FERS-style pension for a 40-year-old government employee based on current salary and years of service. It projects annual and monthly pension for up to 30 years and visualizes the results.

How to Run
----------
- Quick: open `web/index.html` in your browser.
- Using uv (recommended):
  - Ensure uv is installed: https://docs.astral.sh/uv/
  - Serve locally: `uv run python scripts/serve.py --open --port 8000`
  - Then visit `http://127.0.0.1:8000`

Kill a server using port 8000 (macOS/Linux):
- `lsof -ti:8000 | xargs kill -9`

Inputs
------
- Current salary
- Years of service
- Salary growth (annual %)
- Current 401k/TSP balance
- 401k growth assumption (slider %; no new contributions modeled)
- Withdrawal rate slider (e.g., 4%)
- Inflation (for real-dollar view)
- Projection horizon (years)
- Display mode (annual/monthly, nominal/real)

Assumptions (Publicly Available FERS Info)
-----------------------------------------
- Formula: pension = factor × high‑3 average × years of service.
- Factor: 1.0%, or 1.1% if age ≥ 62 and service ≥ 20 (per OPM guidance).
- High‑3: approximated as average of the final 3 years of salary using your growth rate.
- 401k/TSP: balance compounds at your growth slider, with no new contributions; annual income approximated via a 4% withdrawal rule.
- Not modeled: early-retirement reductions (MRA+10), special category employees, sick leave credit, survivor reductions, FEHB/FEGLI, TSP, Social Security, RAA, caps/locality specifics.
- “Today’s $”: deflates nominal pension by your inflation assumption.

Disclaimer
---------
Educational estimate only; not financial advice. Verify with your agency HR/OPM.

Managing Python packages with uv
--------------------------------
- Add deps: `uv add <package> [more…]`
- Remove deps: `uv remove <package>`
- Run scripts/modules: `uv run python scripts/serve.py` or `uv run -m http.server -d web 8000`

Cloud Hosting (iPad-friendly)
-----------------------------
GitHub Pages (no server needed):
- I added `.github/workflows/deploy-pages.yml` which publishes `web/` to GitHub Pages.
- Steps:
  1) Push this repo to GitHub.
  2) In GitHub → Settings → Pages, set Source to “GitHub Actions”.
  3) Push to `main`/`master` or trigger the workflow manually.
  4) Open the URL shown in the workflow output (e.g., `https://<user>.github.io/<repo>/`).

Alternatives:
- GitHub Codespaces: open the repo in Codespaces and use a forwarded public port.
- Netlify/Vercel/Cloudflare Pages: connect the repo and set the publish directory to `web/`.
