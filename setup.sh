#!/usr/bin/env bash

# ==============================================================================
# Script de Instalación y Arranque Multiplataforma (Linux / Ubuntu / macOS / Termux)
# ==============================================================================

echo "========================================================"
echo "🚀 Iniciando Instalación de Dependencias del Sistema"
echo "========================================================"

# Verificación de Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado."
    echo "Por favor instala Node.js (v18 o superior) desde https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js detectado: $NODE_VERSION"

# Verificación de npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm detectado: v$NPM_VERSION"

echo ""
echo "📦 Instalando paquetes de dependencias con npm install..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================================"
    echo "🎉 ¡Instalación completada con éxito!"
    echo "========================================================"
    echo ""
    echo "📋 Comandos disponibles para iniciar el programa:"
    echo "--------------------------------------------------------"
    echo "  1) Modo Desarrollo (Dev Server con HMR):"
    echo "     $ npm run dev"
    echo ""
    echo "  2) Compilar la aplicación (Build para Producción):"
    echo "     $ npm run build"
    echo ""
    echo "  3) Previsualizar la versión de Producción:"
    echo "     $ npm run preview"
    echo "--------------------------------------------------------"
    echo ""
    
    read -p "¿Deseas iniciar el servidor de desarrollo ahora mismo? (s/n): " respuesta
    if [[ "$respuesta" =~ ^[S s]$ ]]; then
        echo "🚀 Iniciando el programa..."
        npm run dev
    else
        echo "👍 Listo. Puedes ejecutar 'npm run dev' en cualquier momento."
    fi
else
    echo "❌ Ocurrió un error durante la instalación de dependencias."
    exit 1
fi
