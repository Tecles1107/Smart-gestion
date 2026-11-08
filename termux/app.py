#!/usr/bin/env python3
"""
Smart Scanner Industrial PRO - Backend para Termux / Linux / Windows
Funciona tanto con Flask como con http.server nativo de Python (¡cero dependencias obligatorias!).
Almacena datos en `inventario_data.json` de manera segura y atómica.
"""

import os
import sys
import json
import socket
from datetime import datetime

PORT = 8000
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventario_data.json')
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def cargar_base_datos():
    if not os.path.exists(DATA_FILE):
        data_inicial = {
            "archivos": {
                "Inventario_General": []
            },
            "ultimo_guardado": datetime.now().isoformat()
        }
        guardar_base_datos(data_inicial)
        return data_inicial
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[!] Error leyendo {DATA_FILE}: {e}")
        return {"archivos": {"Inventario_General": []}}

def guardar_base_datos(datos):
    try:
        temp_file = DATA_FILE + ".tmp"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, DATA_FILE)
        return True
    except Exception as e:
        print(f"[!] Error guardando {DATA_FILE}: {e}")
        return False

# =========================================================
# OPCIÓN A: Intentar arrancar con FLASK si está instalado
# =========================================================
def run_flask():
    from flask import Flask, request, jsonify, render_template, send_from_directory

    app = Flask(__name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)

    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/ping')
    def ping():
        return jsonify({"status": "ok", "app": "Smart Scanner Industrial PRO", "version": "2.0.0"})

    @app.route('/api/cargar_todo', methods=['GET'])
    def api_cargar_todo():
        datos = cargar_base_datos()
        return jsonify(datos)

    @app.route('/api/guardar_sesion', methods=['POST'])
    def api_guardar_sesion():
        payload = request.get_json(force=True, silent=True) or {}
        nombre = payload.get('nombre', '').strip().replace(' ', '_')
        items = payload.get('items', [])

        if not nombre:
            return jsonify({"success": False, "error": "Nombre de área requerido"}), 400

        db = cargar_base_datos()
        if "archivos" not in db:
            db["archivos"] = {}

        db["archivos"][nombre] = items
        db["ultimo_guardado"] = datetime.now().isoformat()
        guardar_base_datos(db)
        return jsonify({"success": True, "area": nombre, "total_items": len(items)})

    local_ip = get_local_ip()
    print("=" * 60)
    print("🚀 SMART SCANNER INDUSTRIAL PRO (Flask) INICIADO")
    print(f"📱 En este teléfono (Termux): http://localhost:{PORT}")
    print(f"🌐 En tu red Wi-Fi (otros dispositivos): http://{local_ip}:{PORT}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=PORT, debug=False)

# =========================================================
# OPCIÓN B: Servidor HTTP Nativo (Zero Dependencies fallback)
# =========================================================
def run_native_http():
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    import mimetypes

    class ScannerHandler(SimpleHTTPRequestHandler):
        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

        def do_GET(self):
            if self.path == '/api/ping':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "mode": "native"}).encode('utf-8'))
                return

            if self.path == '/api/cargar_todo':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                db = cargar_base_datos()
                self.wfile.write(json.dumps(db, ensure_ascii=False).encode('utf-8'))
                return

            # Servir index.html
            if self.path == '/' or self.path == '/index.html':
                filepath = os.path.join(TEMPLATES_DIR, 'index.html')
                if os.path.exists(filepath):
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.end_headers()
                    with open(filepath, 'rb') as f:
                        self.wfile.write(f.read())
                    return

            # Servir archivos estáticos
            if self.path.startswith('/static/'):
                rel_path = self.path[len('/static/'):]
                filepath = os.path.join(STATIC_DIR, rel_path)
                if os.path.exists(filepath) and os.path.isfile(filepath):
                    self.send_response(200)
                    mime, _ = mimetypes.guess_type(filepath)
                    self.send_header('Content-Type', mime or 'application/octet-stream')
                    self.end_headers()
                    with open(filepath, 'rb') as f:
                        self.wfile.write(f.read())
                    return

            self.send_error(404, "Ruta no encontrada")

        def do_POST(self):
            if self.path == '/api/guardar_sesion':
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                try:
                    payload = json.loads(body.decode('utf-8'))
                    nombre = payload.get('nombre', '').strip().replace(' ', '_')
                    items = payload.get('items', [])

                    if not nombre:
                        self.send_response(400)
                        self.end_headers()
                        return

                    db = cargar_base_datos()
                    if "archivos" not in db:
                        db["archivos"] = {}
                    db["archivos"][nombre] = items
                    db["ultimo_guardado"] = datetime.now().isoformat()
                    guardar_base_datos(db)

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "area": nombre}).encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                    return

            self.send_error(404, "Endpoint no encontrado")

    local_ip = get_local_ip()
    print("=" * 60)
    print("🚀 SMART SCANNER INDUSTRIAL PRO (Modo Python Nativo)")
    print(f"📱 En Termux (este teléfono): http://localhost:{PORT}")
    print(f"🌐 En red Wi-Fi: http://{local_ip}:{PORT}")
    print("=" * 60)
    httpd = HTTPServer(('0.0.0.0', PORT), ScannerHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")

if __name__ == '__main__':
    try:
        import flask
        run_flask()
    except ImportError:
        print("[i] Flask no detectado. Iniciando con servidor HTTP nativo de Python...")
        run_native_http()
