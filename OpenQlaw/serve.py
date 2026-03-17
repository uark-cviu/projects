from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

host = "127.0.0.1"
port = 8005

httpd = ThreadingHTTPServer((host, port), SimpleHTTPRequestHandler)
print(f"Serving on http://{host}:{port}")
httpd.serve_forever()
