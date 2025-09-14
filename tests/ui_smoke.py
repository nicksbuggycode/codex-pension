from __future__ import annotations

import os
import pathlib
import time
from playwright.sync_api import sync_playwright


def main() -> None:
    url = os.environ.get("TARGET_URL")
    if not url:
        raise SystemExit("TARGET_URL env var is required")

    outdir = pathlib.Path("screenshots")
    outdir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded")
        # Wait for table and chart to render
        page.wait_for_selector("#resultsTable tbody tr")
        # Small delay to allow chart animation
        page.wait_for_timeout(400)
        # Capture full page
        page.screenshot(path=str(outdir / "full.png"), full_page=True)
        # Capture table region
        table = page.locator("#resultsTable")
        table.screenshot(path=str(outdir / "table.png"))
        # Dump first 5 rows’ text for debugging
        rows = page.locator("#resultsTable tbody tr")
        count = rows.count()
        (outdir / "rows.txt").write_text(
            "rows=" + str(count) + "\n" + "\n".join(rows.nth(i).inner_text() for i in range(min(5, count)))
        )
        browser.close()


if __name__ == "__main__":
    main()

