#!/data/data/com.termux/files/usr/bin/bash
# =====================================================================
# INSTALADOR AUTOMÁTICO - SMART SCANNER INDUSTRIAL PRO PARA TERMUX
# =====================================================================

clear
echo "=================================================================="
echo "📦 CONFIGURANDO SMART SCANNER INDUSTRIAL PRO EN TERMUX..."
echo "=================================================================="

# 1. Actualizar repositorios e instalar paquetes necesarios (Python y Flask)
echo "🔄 1/3 Verificando Python y Flask..."
pkg update -y
pkg install -y python python-pip git 2>/dev/null || true
pkg install -y python-flask 2>/dev/null || pip install flask 2>/dev/null || true

# 2. Determinar la carpeta real donde se encuentra app.py
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 2/3 Preparando directorio de trabajo en: $SCRIPT_DIR"

cd "$SCRIPT_DIR"

# 3. Dar permisos de ejecución
chmod +x app.py 2>/dev/null || true

echo "=================================================================="
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "=================================================================="
echo ""
echo "Para iniciar el servidor ejecuta:"
echo "cd $SCRIPT_DIR && python app.py"
echo ""
echo "Luego abre en Google Chrome en tu teléfono:"
echo "👉 http://localhost:8000"
echo "=================================================================="
echo ""

# Iniciar servidor inmediatamente
python app.py
