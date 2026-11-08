import React from 'react';
import { X, Search, MapPin, Calendar, ArrowDown, Package, Layers } from 'lucide-react';
import { AuditResult } from '../types/inventory';

interface AuditModalProps {
  audit: AuditResult | null;
  onClose: () => void;
  onLoadToForm: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ audit, onClose, onLoadToForm }) => {
  if (!audit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-950 to-slate-900 p-3.5 border-b border-cyan-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Auditoría Global de Existencias</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar auditoría"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details */}
        <div className="p-4 flex flex-col gap-3">
          <div>
            <span className="font-mono text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded">
              SKU: {audit.sku}
            </span>
            <h4 className="text-base font-bold text-white mt-1.5">{audit.nombre}</h4>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                En esta área actual:
              </span>
              <div className="text-lg font-black text-blue-400 font-mono">
                {audit.stockAreaBultos} <span className="text-xs font-normal text-slate-400">b</span> /{' '}
                {audit.stockAreaPiezas} <span className="text-xs font-normal text-slate-400">pzs</span>
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Total Global (Todas las áreas):
              </span>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {audit.stockGlobalBultos} <span className="text-xs font-normal text-slate-400">b</span> /{' '}
                {audit.stockGlobalPiezas} <span className="text-xs font-normal text-slate-400">pzs</span>
              </div>
            </div>
          </div>

          {/* Breakdown list per area */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Desglose de Ubicaciones:
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950">
              {audit.desglosePorArea.map((detail, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>{detail.area}</span>
                      {detail.caducidad && (
                        <span className="text-[10px] text-rose-400 bg-rose-950/70 border border-rose-800/40 px-1.5 py-0.2 rounded">
                          ⏳ {detail.caducidad}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {detail.bultos} bultos ({detail.total} piezas totales)
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono">
                    {detail.fecha}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button: Traer a captura */}
          <button
            onClick={onLoadToForm}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-1"
          >
            <ArrowDown className="w-4 h-4" />
            <span>Cargar en formulario para registrar cantidades</span>
          </button>
        </div>
      </div>
    </div>
  );
};
