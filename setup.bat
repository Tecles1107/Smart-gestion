@echo off
chcp 65001 > nul
title Instalador y Lanzador del Sistema

echo ========================================================
echo 🚀 Iniciando Instalacion de Dependencias en Windows
echo ========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no esta instalado.
    echo Por favor descarga e instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo ✅ Node.js detectado: %NODE_VER%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: npm no esta disponible.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo ✅ npm detectado: v%NPM_VER%

echo.
echo 📦 Instalando paquetes de dependencias con npm install...
call npm install

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo 🎉 ¡Instalacion completada con exito!
    echo ========================================================
    echo.
    echo 📋 Comandos disponibles para iniciar el programa:
    echo --------------------------------------------------------
    echo  1) Modo Desarrollo:
    echo     npm run dev
    echo.
    echo  2) Compilar Produccion:
    echo     npm run build
    echo.
    echo  3) Previsualizar Produccion:
    echo     npm run preview
    echo --------------------------------------------------------
    echo.
    set /p RESP="¿Deseas iniciar el servidor de desarrollo ahora mismo? (s/n): "
    if /i "%RESP%"=="s" (
        echo 🚀 Iniciando el programa...
        call npm run dev
    ) else (
        echo 👍 Listo. Puedes ejecutar 'npm run dev' cuando desees.
        pause
    )
) else (
    echo ❌ Ocurrio un error durante la instalacion de dependencias.
    pause
    exit /b 1
)
