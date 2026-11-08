#!/data/data/com.termux/files/usr/bin/bash
# =====================================================================
# SMART SCANNER INDUSTRIAL PRO - INICIADOR RÁPIDO PARA TERMUX
# =====================================================================

clear
echo "=================================================================="
echo "⚡ INICIANDO SMART SCANNER INDUSTRIAL PRO..."
echo "=================================================================="

# 1. Si Node.js está disponible, intentar iniciar con Node (React PWA)
if command -v node &> /dev/null; then
    echo "🚀 Detectado Node.js. Iniciando aplicación web completa (Puerto 3000)..."
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependencias de Node..."
        npm install
    fi
    echo "👉 Abre en tu navegador Chrome de Android: http://localhost:3000"
    npm run dev
    exit 0
fi

# 2. Si Python está disponible, iniciar con app.py (Puerto 8000)
if command -v python3 &> /dev/null || command -v python &> /dev/null; then
    PYTHON_CMD=$(command -v python3 || command -v python)
    echo "🐍 Detectado Python. Iniciando servidor (Puerto 8000)..."
    echo "👉 Abre en tu navegador Chrome de Android: http://localhost:8000"
    $PYTHON_CMD app.py
    exit 0
fi

echo "❌ Ni Node.js ni Python están instalados."
echo "Ejecuta: pkg update && pkg install nodejs python -y"
