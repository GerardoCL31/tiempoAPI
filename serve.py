from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


HOST = "127.0.0.1"
PORT = 8000


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
    print(f"Servidor disponible en http://{HOST}:{PORT}")
    server.serve_forever()
