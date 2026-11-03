"""Local server that behaves like vercel.json: a page without its own file gets index.html.

    python tools/serve.py          # http://localhost:8000
    python tools/serve.py 8010
"""
import http.server
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def send_head(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        local = ROOT / path.lstrip('/')
        if '.' not in path.rsplit('/', 1)[-1] and not (local / 'index.html').exists() and not local.is_file():
            self.path = '/index.html'
        return super().send_head()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'http://localhost:{port}')
    http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
