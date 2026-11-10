# Smart Scanner Industrial Pro 🏭📱

Sistema completo de gestión de inventarios para almacén e industria, optimizado para PWA, dispositivos móviles, escritorio (**Windows**, **Ubuntu/Linux**, **macOS**) y ejecución nativa en **Termux (Android)**.

---

## 🚀 Instalación Rápida Multiplataforma

El proyecto incluye instaladores automáticos sincronizados para cada sistema operativo que verifican **Node.js** y **npm**, instalan las dependencias y muestran los comandos de inicio.

### 1. En Ubuntu / Linux / macOS / Termux (Android)
```bash
chmod +x setup.sh
./setup.sh
```
*(En Termux, si aún no tienes Node.js instalado, ejecuta primero: `pkg update -y && pkg install -y nodejs git`)*

### 2. En Windows (CMD / Explorador de Archivos)
- Haz **doble clic** en el archivo **`setup.bat`**, o ejecútalo desde la consola CMD:
```cmd
setup.bat
```

### 3. Instalador Universal (Cualquier Sistema Operativo con Node.js)
```bash
npm run setup
```

### 4. Instalación Manual Paso a Paso
```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Iniciar el servidor de desarrollo (puerto 3000)
npm run dev
```
Una vez iniciado, abre tu navegador en **`http://localhost:3000`**.

---

## 📋 Comandos Disponibles (`package.json`)

| Comando | Descripción |
| :--- | :--- |
| `npm run setup` | Ejecuta el instalador universal (`scripts/setup.js`). |
| `npm run dev` | Inicia el servidor Express + Vite en modo desarrollo (`http://localhost:3000`). |
| `npm run start` | Inicia el servidor en modo producción (`tsx server.ts`). |
| `npm run build` | Compila la aplicación optimizada en la carpeta `dist/`. |
| `npm run preview` | Previsualiza localmente la versión compilada de `dist/`. |
| `npm run lint` | Verifica errores de TypeScript (`tsc --noEmit`). |
| `npm run test:unit` | Ejecuta las pruebas unitarias de lógica de inventario. |

---

## 📂 Estructura del Proyecto

- **`setup.sh`**: Instalador y lanzador automático para Ubuntu, Linux, macOS y Termux.
- **`setup.bat`**: Instalador y lanzador automático para Windows CMD.
- **`scripts/setup.js`**: Script universal en Node.js (`npm run setup`).
- **`server.ts`**: Servidor Express con persistencia de inventario en archivo local (`inventario_data.json`) y API REST para sincronización.
- **`src/`**:
  - **`App.tsx`**: Aplicación React PWA con gestión de estado offline/online y persistencia local.
  - **`components/`**:
    - `CameraScanner.tsx`: Escáner de cámara inteligente con reinicio automático de captura.
    - `InventoryForm.tsx`: Formulario de captura rápida, cajas mixtas, fecha de caducidad y auto-completado.
    - `InventoryTable.tsx`: Tabla interactiva de productos con filtros y eliminación individual/masiva.
    - `Dashboard.tsx`: Centro de analíticas con gráficos en Recharts (flujo histórico, distribución por área y alertas).
    - `RightSidebarDrawer.tsx`: Panel de Gestión y Ajustes (Sincronización, Merma, Caducidad 20 días, Manual Bilingüe y Centro de Actualizaciones).
    - `UserManual.tsx`: Manual interactivo de usuario en Español e Inglés.
    - `SoftwareUpdateCenter.tsx`: Centro de actualizaciones de software y carga de paquetes.
    - `LookupModal.tsx`: Modo consulta rápida para buscar SKU/Código sin alterar datos.
    - `AreasModal.tsx`: Gestión y eliminación limpia de áreas de almacenamiento.
    - `Navbar.tsx`: Barra superior con centro de notificaciones de productos por caducar y accesos directos.

---

## 🌐 Despliegue en GitHub Pages (PWA Estática Gratuita)

La aplicación está preparada para desplegarse en **GitHub Pages**:

### Método 1: Despliegue Automático con GitHub Actions (Recomendado)
El proyecto ya cuenta con el flujo de trabajo configurado en `.github/workflows/deploy.yml`:

1. Sube tu código al repositorio de GitHub:
   ```bash
   git add .
   git commit -m "Deploy Smart Scanner PRO"
   git push origin main
   ```
2. En GitHub, ve a **Settings** > **Pages**.
3. En **Source** (Origen de compilación), selecciona **GitHub Actions**.
4. ¡Listo! La acción compilará y publicará automáticamente tu aplicación en una URL pública con HTTPS (ejemplo: `https://tu-usuario.github.io/tu-repo/`).

### Método 2: Despliegue Manual con la carpeta `dist`
1. Compila el proyecto localmente:
   ```bash
   npm run build
   ```
2. Se generará la carpeta `dist/` con rutas relativas compatibles (`base: './'`).
3. Sube el contenido de la carpeta `dist/` a la rama `gh-pages` de tu repositorio.

> **Nota de Compatibilidad:**
> En GitHub Pages la aplicación funciona al 100% como Progressive Web App (PWA):
> - Escaneo con cámara y láser.
> - Almacenamiento local persistente (`localStorage`).
> - Módulo de Gestión, Merma y Búsqueda con Foto.
> - Descargas de reportes en Excel, PDF y Word con fotos incrustadas.
> - Funciona sin conexión a internet (offline).
> *(La sincronización con servidor Node.js central solo se requiere si deseas enlazar múltiples dispositivos a un mismo archivo JSON en red local/Termux).*

---

## 🛠️ Verificación y Compilación
Para verificar que el código compila sin errores antes de desplegar o mover a un servidor:

```bash
npm run lint
npm run build
```
