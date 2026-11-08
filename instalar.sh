#!/data/data/com.termux/files/usr/bin/bash
# =====================================================================
# INSTALADOR AUTOMÁTICO - SMART SCANNER INDUSTRIAL PRO
# =====================================================================

clear
echo "=================================================================="
echo "🚀 SMART SCANNER INDUSTRIAL PRO - INSTALADOR & INICIADOR TERMUX"
echo "=================================================================="
echo ""
echo "Selecciona el modo de ejecución:"
echo " 1) Node.js + React PWA (RECOMENDADO: Interfaz PWA completa, Dashboard y Escáner)"
echo " 2) Python + Flask / Nativo (Modo Ligero Standalone)"
echo " 3) Salir"
echo ""
read -p "Ingresa una opción (1-3) [1 por defecto]: " opcion
opcion=${opcion:-1}

if [ "$opcion" = "1" ]; then
    echo ""
    echo "📦 [1/2] Verificando e instalando Node.js..."
    pkg update -y
    pkg install -y nodejs git

    echo ""
    echo "📦 [2/2] Instalando dependencias de Node..."
    npm install

    echo ""
    echo "=================================================================="
    echo "✅ SERVIDOR INICIANDO EN PUERTO 3000..."
    echo "=================================================================="
    echo "👉 Abre en tu navegador Chrome de Android: http://localhost:3000"
    echo "=================================================================="
    echo ""
    npm run dev

elif [ "$opcion" = "2" ]; then
    echo ""
    echo "🐍 Verificando Python..."
    pkg update -y
    pkg install -y python python-flask 2>/dev/null || true

    echo ""
    echo "=================================================================="
    echo "✅ INICIANDO SERVIDOR PYTHON EN PUERTO 8000..."
    echo "=================================================================="
    echo "👉 Abre en tu navegador Chrome de Android: http://localhost:8000"
    echo "=================================================================="
    echo ""
    python3 app.py 2>/dev/null || python app.py
else
    echo "👋 Operación cancelada."
    exit 0
fi
