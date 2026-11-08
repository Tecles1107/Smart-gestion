# 📦 Smart Scanner Industrial PRO - Guía Oficial Termux (Android)

## 🚀 Instalación Rápida en 1 Comando en Termux:

Abre la app **Termux** en tu teléfono Android y pega lo siguiente:

```bash
pkg update -y && pkg install -y python git && pip install flask
```

Luego inicia el servidor:
```bash
python app.py
```

Y abre en tu navegador Chrome del teléfono:
👉 **`http://localhost:8000`**

---

## 📂 Estructura de Archivos Recomendada en Termux:

```text
~/smart-scanner-pro/
├── app.py                   # Servidor Python (Flask + fallback HTTP nativo)
├── inventario_data.json     # Base de datos local automática con respaldo
├── templates/
│   └── index.html           # Interfaz web móvil industrial adaptada
├── static/
│   ├── css/
│   │   └── styles.css       # Estilos táctiles para almacén
│   └── js/
│       └── main.js          # Lógica de escáner láser, cálculo de bultos y exportación
├── instalar.sh              # Script de instalación automática
└── iniciar.sh               # Script de inicio rápido
```

---

## 📷 Solución para la Cámara en Android:

1. **Si usas Chrome en el mismo teléfono donde corre Termux:**
   - La dirección `http://localhost:8000` o `http://127.0.0.1:8000` es tratada por Chrome como **Entorno Seguro**.
   - Chrome te pedirá permiso de cámara y funcionará directamente.

2. **Si abres desde otra computadora/tablet en la misma red Wi-Fi (`http://192.168.x.x:8000`):**
   - Chrome bloquea cámaras en `http://` no-localhost por seguridad.
   - **Solución fácil en Chrome móvil:**
     1. Abre `chrome://flags` en Chrome.
     2. Busca: `Insecure origins treated as secure`.
     3. Actívalo (Enabled) y en la casilla escribe: `http://TU_IP:8000` (ej: `http://192.168.1.100:8000`).
     4. Reinicia Chrome. ¡Listo! La cámara funcionará a toda velocidad.

---

## 🛠️ Comandos de Mantenimiento en Termux:

- **Detener el servidor:** Presiona `CTRL + C` en Termux.
- **Reiniciar servidor:** `python app.py`
- **Hacer copia de respaldo de tus datos:** `cp inventario_data.json ~/descargas_backup.json`
