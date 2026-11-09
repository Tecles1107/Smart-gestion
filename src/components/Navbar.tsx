import React, { useState } from 'react';
import {
  Menu,
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
  Settings,
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
  onOpenShade?: () => void;
  onOpenLeftDrawer?: () => void;
  onOpenRightDrawer?: () => void;
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
  onOpenShade,
  onOpenLeftDrawer,
  onOpenRightDrawer,
}) => {
  const isGeneral = activeArea === 'Inventario_General';
  const displayName = activeArea.replace(/_/g, ' ');
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleLeftPointerDown = (e: React.PointerEvent) => {
    const startX = e.clientX;
    const handlePointerMove = (moveEv: PointerEvent) => {
      if (moveEv.clientX - startX > 12 && onOpenLeftDrawer) {
        onOpenLeftDrawer();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      }
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleRightPointerDown = (e: React.PointerEvent) => {
    const startX = e.clientX;
    const handlePointerMove = (moveEv: PointerEvent) => {
      if (startX - moveEv.clientX > 12 && onOpenRightDrawer) {
        onOpenRightDrawer();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      }
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleShadePointerDown = (e: React.PointerEvent) => {
    const startY = e.clientY;
    const handlePointerMove = (moveEv: PointerEvent) => {
      if (moveEv.clientY - startY > 12 && onOpenShade) {
        onOpenShade();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      }
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Brand, Hamburger Menu, View Mode Tabs and Area */}
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
          {/* Prominent 3-Lines Hamburger Left Side Menu Button */}
          <button
            type="button"
            onClick={onOpenLeftDrawer}
            onPointerDown={handleLeftPointerDown}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-400 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm group cursor-grab active:cursor-grabbing select-none"
            title="Mantén presionado y desliza a la derecha (o toca) para desplegar el Menú de Almacenes e Inventarios"
          >
            <Menu className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="font-bold text-xs uppercase tracking-wider hidden xs:inline">Menú</span>
          </button>

          <button
            type="button"
            onClick={onOpenShade}
            onPointerDown={handleShadePointerDown}
            className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg transition-all active:scale-95 group cursor-grab active:cursor-grabbing select-none"
            title="Mantén presionado y desliza hacia abajo (o toca) para desplegar el Panel Cortinilla Android PRO"
          >
            <Boxes className="w-5 h-5 text-blue-400 shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="font-black tracking-wider text-xs uppercase hidden sm:inline">Scanner</span>
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm group-hover:bg-blue-500 transition-colors flex items-center gap-0.5">
              <span>PRO</span>
              <span className="text-[8px] opacity-90 font-black">▼</span>
            </span>
          </button>

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
            className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Modo Consulta y Búsqueda Solo Lectura"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Buscar Código</span>
          </button>

          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl border font-semibold ${
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
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 animate-pulse"
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
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}

          {/* Gestión y Ajustes Prominente (Despliega el Centro de Gestión y Control) */}
          <button
            onClick={onOpenRightDrawer}
            onPointerDown={handleRightPointerDown}
            aria-label="Gestión y Ajustes de Almacén"
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-grab active:cursor-grabbing select-none group"
            title="Mantén presionado y desliza a la izquierda (o toca) para desplegar el Panel de Gestión y Ajustes"
          >
            <Settings className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span>Gestión / Ajustes</span>
          </button>

          {/* Guardar Datos Manualmente */}
          <button
            onClick={onManualSave}
            aria-label="Guardar Datos Manualmente"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Guardar Datos Manualmente en LocalStorage y Servidor"
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
