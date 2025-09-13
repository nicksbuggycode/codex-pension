"""
Lightweight static file server for the SPA using only the Python stdlib.

Usage:
  uv run python scripts/serve.py --port 8000

Serves the `web/` directory at http://localhost:<port>
"""
from __future__ import annotations

import argparse
import contextlib
import http.server
import os
import socket
import socketserver
import sys
import threading
import time
import webbrowser


class Handler(http.server.SimpleHTTPRequestHandler):
    # Serve files from the web/ directory
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.getcwd(), "web"), **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("[devserver] " + (format % args) + "\n")


def find_free_port(preferred: int) -> int:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        try:
            s.bind(("127.0.0.1", preferred))
            return preferred
        except OSError:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the web/ directory")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to use (default: 8000)")
    parser.add_argument("--open", action="store_true", help="Open the browser after starting")
    args = parser.parse_args()

    port = find_free_port(args.port)
    with socketserver.ThreadingTCPServer((args.host, port), Handler) as httpd:
        httpd.allow_reuse_address = True
        url = f"http://{args.host}:{port}"
        print(f"Serving web/ at {url}")
        if args.open:
            # Open a browser tab shortly after the server starts
            threading.Timer(0.4, lambda: webbrowser.open_new_tab(url)).start()
        try:
            httpd.serve_forever(poll_interval=0.2)
        except KeyboardInterrupt:
            print("\nShutting down…")


if __name__ == "__main__":
    main()

