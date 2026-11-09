import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Volume2,
  VolumeX,
  Zap,
  Wifi,
  WifiOff,
  BatteryCharging,
  Battery,
  ShieldCheck,
  FolderOpen,
  RotateCw,
  Activity,
  Bell,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AndroidNotificationShadeProps {
  isOpen: boolean;
  onClose: () => void;
  activeArea: string;
  totalItems: number;
  totalPiezas: number;
  totalValor: number;
  isOnline: boolean;
  isBackendConnected: boolean;
  quickScanMode: boolean;
  onToggleQuickScanMode: (val: boolean) => void;
  onForceSync: () => void;
  onOpenAreas: () => void;
  onOpenDiagnostic: () => void;
}

export const AndroidNotificationShade: React.FC<AndroidNotificationShadeProps> = ({
  isOpen,
  onClose,
  activeArea,
  totalItems,
  totalPiezas,
  totalValor,
  isOnline,
  isBackendConnected,
  quickScanMode,
  onToggleQuickScanMode,
  onForceSync,
  onOpenAreas,
  onOpenDiagnostic,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [timeStr, setTimeStr] = useState<string>('');

  // Update clock time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Battery status API if supported by browser
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        const onLevelChange = () => setBatteryLevel(Math.round(battery.level * 100));
        const onChargingChange = () => setIsCharging(battery.charging);

        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onChargingChange);
      }).catch(() => {});
    }
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Android Notification Shade Drawer Panel with real-time drag gestures */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={(_e, info) => {
              // If pulled up significantly or flicked upward, close the shade
              if (info.offset.y < -70 || info.velocity.y < -200) {
                onClose();
              }
            }}
            initial={{ y: '-100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-50 max-w-2xl mx-auto bg-slate-950/95 border-b border-blue-500/40 rounded-b-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 backdrop-blur-md cursor-grab active:cursor-grabbing select-none"
          >
            {/* Top Status Bar (Android Header style) */}
            <div className="px-4 pt-3 pb-2 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wider text-sm">{timeStr}</span>
                <span className="text-slate-600">|</span>
                <span className="text-[11px] text-blue-400 font-sans font-bold flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>SMART SCANNER PRO</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                {/* Battery status */}
                <div className="flex items-center gap-1 text-[11px]" title="Estado de Batería">
                  {isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  <span>{batteryLevel !== null ? `${batteryLevel}%` : 'OK'}</span>
                </div>

                {/* Connection */}
                <div className="flex items-center gap-1 text-[11px]">
                  {isOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  aria-label="Cerrar panel deslizable"
                  className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Settings Grid (Android Toggles style) */}
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ajustes Rápidos de Control</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  SISTEMA PRO ACTIVO
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {/* Toggle 1: Quick Scan Mode */}
                <button
                  type="button"
                  onClick={() => onToggleQuickScanMode(!quickScanMode)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    quickScanMode
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Zap className={`w-5 h-5 ${quickScanMode ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span className="text-[10px] font-bold text-center leading-tight">Escaneo Rápido</span>
                </button>

                {/* Toggle 2: Sound Beep toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    soundEnabled
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/20 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-white" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-500" />
                  )}
                  <span className="text-[10px] font-bold text-center leading-tight">Sonido Laser</span>
                </button>

                {/* Toggle 3: Areas Manager */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAreas();
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] font-bold text-center leading-tight truncate w-full">
                    {activeArea.replace(/_/g, ' ')}
                  </span>
                </button>

                {/* Toggle 4: Force Consolidate */}
                <button
                  type="button"
                  onClick={() => {
                    onForceSync();
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCw className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-center leading-tight">Consolidar</span>
                </button>
              </div>

              {/* Live Inventory Notification Banner Card */}
              <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-blue-950/60 border border-blue-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300 shrink-0">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>Área: {activeArea.replace(/_/g, ' ')}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                        {totalItems} ítems
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono flex items-center gap-2">
                      <span>Piezas: <strong className="text-emerald-400">{totalPiezas}</strong></span>
                      <span>•</span>
                      <span>Valor: <strong className="text-white">${totalValor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDiagnostic();
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold shrink-0 transition-colors"
                >
                  Diagnóstico
                </button>
              </div>

              {/* Dynamic Notification Modules Container (Ready for upcoming user additions) */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Notificaciones y Módulos PRO</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Panel Deslizable Android</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 text-xs text-slate-300">
                  <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">Panel Deslizable Integrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Listo para integrar las nuevas funciones y notificaciones que me indiques. Puedes deslizar hacia arriba o presionar el botón para cerrar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Pull / Drag Handle bar */}
            <div
              onClick={onClose}
              className="py-2.5 bg-slate-950 hover:bg-slate-900 border-t border-slate-800/80 flex items-center justify-center cursor-pointer group transition-colors"
              title="Deslizar o tocar para cerrar cortinilla"
            >
              <div className="flex flex-col items-center gap-0.5 text-slate-500 group-hover:text-blue-400 transition-colors">
                <div className="w-12 h-1 bg-slate-700 group-hover:bg-blue-500 rounded-full transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Deslizar para cerrar</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
