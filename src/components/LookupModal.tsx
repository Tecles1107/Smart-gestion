import React, { useState, useMemo } from 'react';
import { Search, X, Package, MapPin, Calendar, DollarSign, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { cleanNum, calculatePiecesPerBundle } from '../utils/inventoryLogic';

interface LookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAreaItems: Record<string, InventoryItem[]>;
  onSelectCode?: (code: string) => void;
}

export const LookupModal: React.FC<LookupModalProps> = ({
  isOpen,
  onClose,
  allAreaItems,
  onSelectCode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    const clean = cleanNum(searchTerm);
    const termUpper = searchTerm.trim().toUpperCase();

    if (!clean && !termUpper) return [];

    const matches: { item: InventoryItem; area: string }[] = [];

    Object.entries(allAreaItems).forEach(([areaKey, items]) => {
      items.forEach((it) => {
        const itemCleanCode = cleanNum(it.Código);
        const itemUpperName = (it.Nombre || '').toUpperCase();

        const matchCode = clean && itemCleanCode.includes(clean);
        const matchName = termUpper && itemUpperName.includes(termUpper);

        if (matchCode || matchName) {
          matches.push({
            item: it,
            area: areaKey.replace(/_/g, ' '),
          });
        }
      });
    });

    return matches.slice(0, 20); // Top 20 matches
  }, [searchTerm, allAreaItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Modo Consulta / Búsqueda Solo Lectura</h3>
              <p className="text-[11px] text-slate-400">Busca e inspeciona códigos sin modificar o agregar al inventario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe código de barras o nombre del producto..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border-2 border-cyan-500/50 focus:border-cyan-400 rounded-xl text-sm text-white font-mono focus:outline-none placeholder:font-sans placeholder:text-slate-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {searchTerm.trim().length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-slate-700 stroke-[1.5]" />
              <span>Escribe o escanea un código arriba para ver su existencia en todas las áreas.</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-400" />
              <span>No se encontraron coincidencias para "{searchTerm}".</span>
            </div>
          ) : (
            searchResults.map(({ item, area }, idx) => {
              const pzRatio = calculatePiecesPerBundle(item);
              return (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-cyan-300 bg-cyan-950 border border-cyan-800/60 px-2 py-0.5 rounded">
                        {item.Código}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-1 uppercase">{item.Nombre}</h4>
                    </div>

                    <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{area}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2 rounded-lg text-xs font-mono border border-slate-800/60">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                        <Package className="w-3 h-3 text-slate-400" /> Bultos
                      </span>
                      <span className="font-bold text-white mt-0.5">{item.Bultos || 0}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                        <Layers className="w-3 h-3 text-slate-400" /> Pzs/Bto
                      </span>
                      <span className="font-bold text-blue-400 mt-0.5">{pzRatio} u</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                        Total Stock
                      </span>
                      <span className="font-black text-emerald-400 mt-0.5">{item.Total || 0} pzs</span>
                    </div>
                  </div>

                  {(item.Caducidad || (Number(item.Precio) || 0) > 0) && (
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      {item.Caducidad && (
                        <span className="flex items-center gap-1 text-rose-300">
                          <Calendar className="w-3 h-3 text-rose-400" /> Vence: {item.Caducidad}
                        </span>
                      )}
                      {(Number(item.Precio) || 0) > 0 && (
                        <span className="flex items-center gap-1 text-emerald-300">
                          <DollarSign className="w-3 h-3 text-emerald-400" /> ${item.Precio}
                        </span>
                      )}
                    </div>
                  )}

                  {onSelectCode && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCode(item.Código);
                        onClose();
                      }}
                      className="mt-1 py-1.5 px-3 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cargar en Formulario de Registro</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
