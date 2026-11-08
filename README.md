# Smart Scanner Industrial Pro 🏭📱

Sistema completo de gestión de inventarios para almacén e industria, optimizado para PWA, dispositivos móviles y ejecución nativa en **Termux (Android)**.

---

## 🚀 Guía de Ejecución en Termux (Android)

### Opción A: Ejecución Directa Automática (Recomendada)
En la terminal de Termux ejecuta:

```bash
cd ~/smart-scanner-industrial-pro
chmod +x instalar.sh termux/instalar.sh
bash instalar.sh
```

El script instalará automáticamente **Node.js** y las dependencias, e iniciará la aplicación en **`http://localhost:3000`**. Abre Google Chrome en tu Android e ingresa a ese enlace.

---

### Opción B: Ejecución Manual con Node.js / React (Recomendada)

Si prefieres ejecutar paso a paso:

```bash
# 1. Actualizar paquetes e instalar Node.js
pkg update -y
pkg install -y nodejs git

# 2. Entrar a la carpeta del proyecto
cd ~/smart-scanner-industrial-pro

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor
npm run dev
```

Abre Chrome en Android en: **`http://localhost:3000`**

---

### Opción C: Ejecución con Python Flask (Modo Standalone Ligero)

```bash
cd ~/smart-scanner-industrial-pro
bash termux/instalar.sh
```

Abre Chrome en Android en: **`http://localhost:8000`**

---

## 📂 Estructura del Proyecto (Final y Definitiva)

La estructura actual de **14 directorios y 48 archivos** es la estructura **completa y final**. No requerirá más archivos adicionales para funcionar.

- **`instalar.sh`**: Script de inicio rápido para Termux.
- **`server.ts`**: Servidor Express con persistencia de inventario en archivo local (`inventario_data.json`) y API REST para sincronización.
- **`src/`**:
  - **`App.tsx`**: Aplicación React PWA con gestión de estado offline/online y persistencia en borrador.
  - **`components/`**:
    - `CameraScanner.tsx`: Escáner de cámara inteligente con reinicio automático de captura.
    - `InventoryForm.tsx`: Formulario de captura rápida, cajas mixtas, fecha caducidad, auto-completado y caja mixta.
    - `InventoryTable.tsx`: Tabla interactiva de productos con eliminación individual y masiva.
    - `Dashboard.tsx`: Centro de analíticas con gráficos en Recharts (distribución por área, más stock y alerta de caducidad).
    - `LookupModal.tsx`: Modo consulta rápida para buscar SKU/Código sin alterar datos.
    - `AreasModal.tsx`: Gestión y eliminación limpia de áreas de almacenamiento.
    - `Navbar.tsx`: Barra superior con centro de notificaciones de productos por caducar y accesos directos.
- **`termux/`**: Archivos del servidor Flask alternativo.

---

## 🛠️ Verificación y Compilación
Para verificar que el código compila sin errores antes de desplegar o mover a un servidor:

```bash
npm run lint
```
