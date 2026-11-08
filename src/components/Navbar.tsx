import React, { useState } from 'react';
import {
  Boxes,
  FolderOpen,
  FileSpreadsheet,
  Save,
  Terminal,
  Activity,
  Wifi,
  WifiOff,
  CloudUpload,
  Download,
  Smartphone,
  BarChart2,
  Scan,
  Search,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavbarProps {
  activeArea: string;
  isBackendConnected: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  totalItems: number;
  activeTab: 'operacion' | 'dashboard';
  onChangeTab: (tab: 'operacion' | 'dashboard') => void;
  onOpenLookup: () => void;
  onOpenAreas: () => void;
  onOpenImport: () => void;
  onOpenTermux: () => void;
  onOpenDiagnostic: () => void;
  onManualSave: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeArea,
  isBackendConnected,
  isOnline,
  pendingSyncCount,
  isSyncing,
  totalItems,
  activeTab,
  onChangeTab,
  onOpenLookup,
  onOpenAreas,
  onOpenImport,
  onOpenTermux,
  onOpenDiagnostic,
  onManualSave,
}) => {
  const isGeneral = activeArea === 'Inventario_General';
  const displayName = activeArea.replace(/_/g, ' ');
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Brand, View Mode Tabs and Area */}
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg">
            <Boxes className="w-5 h-5 text-blue-400 shrink-0" />
            <span className="font-black tracking-wider text-xs uppercase hidden sm:inline">Scanner</span>
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PRO</span>
          </div>

          {/* Navigation View Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeTab('operacion')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                activeTab === 'operacion'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Escáner</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('dashboard')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>

          <button
            onClick={onOpenAreas}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold truncate transition-colors border ${
              isGeneral
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-blue-950/70 border-blue-500/40 text-blue-300 hover:bg-blue-900/80'
            }`}
            title="Cambiar Área de Trabajo"
          >
            <span className="truncate max-w-[90px] sm:max-w-[140px]">{displayName}</span>
            <span className="text-[10px] opacity-75 font-mono">({totalItems})</span>
          </button>
        </div>

        {/* Action Buttons and Network Indicators */}
        <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-end">
          {/* Read-Only Barcode Lookup Modal Trigger */}
          <button
            onClick={onOpenLookup}
            className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
            title="Modo Consulta y Búsqueda Solo Lectura"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Buscar Código</span>
          </button>

          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border font-semibold ${
              !isOnline
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : isSyncing
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : pendingSyncCount > 0
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-400'
            }`}
            title={
              !isOnline
                ? 'Sin conexión a internet (Modo Offline activo con Service Worker)'
                : isSyncing
                ? 'Sincronizando cambios con el servidor...'
                : pendingSyncCount > 0
                ? `${pendingSyncCount} cambios pendientes por sincronizar`
                : 'Conectado y sincronizado'
            }
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline</span>
              </>
            ) : isSyncing ? (
              <>
                <CloudUpload className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                <span className="hidden sm:inline">Sincronizando...</span>
              </>
            ) : pendingSyncCount > 0 ? (
              <>
                <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
                <span>{pendingSyncCount} pend.</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Online</span>
              </>
            )}
          </div>

          {/* PWA Install Button (if installable) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              aria-label="Instalar como App PWA"
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 animate-pulse"
              title="Instalar como App en tu teléfono o PC"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <button
              onClick={() => setShowIOSGuide(true)}
              aria-label="Instalar en iOS"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}

          <button
            onClick={onOpenDiagnostic}
            aria-label="Diagnóstico del Sistema"
            className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-all"
            title="Diagnóstico del Sistema"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden lg:inline">Diag</span>
          </button>

          <button
            onClick={onOpenTermux}
            aria-label="Guía y Configuración de Termux"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300 border border-emerald-600/40 text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
            title="Guía y Configuración de Termux"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Termux</span>
          </button>

          <button
            onClick={onOpenImport}
            aria-label="Subir Archivo Excel o CSV"
            className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800/80 text-cyan-200 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 transition-all"
            title="Importar Excel o CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onOpenAreas}
            aria-label="Gestor de Áreas"
            className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Gestor de Áreas"
          >
            <FolderOpen className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Áreas</span>
          </button>

          <button
            onClick={onManualSave}
            aria-label="Guardar Datos Manualmente"
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
            title="Guardar Datos Manualmente"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Guardar</span>
          </button>
        </div>
      </div>

      {/* iOS Safari Guided Install Sheet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-xs text-slate-300">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Instalar en iPhone / iPad</span>
            </h3>
            <p className="leading-relaxed mb-3">
              1. Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba en Safari).<br />
              2. Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
