import React from 'react';
import { X, Activity, RefreshCw, CheckCircle2, AlertCircle, Database, Sparkles } from 'lucide-react';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBackendConnected: boolean;
  activeArea: string;
  activeItemsCount: number;
  totalGlobalItemsCount: number;
  onForceSync: () => void;
  onLoadDemoData: () => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  isOpen,
  onClose,
  isBackendConnected,
  activeArea,
  activeItemsCount,
  totalGlobalItemsCount,
  onForceSync,
  onLoadDemoData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 to-slate-900 p-3.5 border-b border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Diagnóstico y Salud del Sistema</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal diagnóstico"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 text-xs text-slate-300">
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Servidor Termux / Backend:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  isBackendConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isBackendConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conectado (HTTP 200)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" /> LocalStorage Activo
                  </>
                )}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Área Activa:</span>
              <strong className="text-blue-300">{activeArea.replace(/_/g, ' ')}</strong>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Productos en esta área:</span>
              <strong className="text-white font-mono">{activeItemsCount}</strong>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Total en Almacén Global:</span>
              <strong className="text-emerald-400 font-mono">{totalGlobalItemsCount}</strong>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => {
                onForceSync();
              }}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sincronizar y Consolidar Todo</span>
            </button>

            <a
              href="/api/descargar_bd"
              download="inventario_respaldo.json"
              className="w-full py-2.5 px-3 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/40 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-center"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Descargar Copia de Seguridad (.json)</span>
            </a>

            <button
              onClick={() => {
                onLoadDemoData();
                onClose();
              }}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-amber-300 border border-amber-500/30 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Cargar Datos de Demostración Industrial</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
