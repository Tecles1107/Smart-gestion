import React, { useState, useMemo } from 'react';
import {
  Menu,
  X,
  Plus,
  Check,
  RotateCw,
  Trash2,
  Sparkles,
  Layers,
  Search,
  FileSpreadsheet,
  Building2,
  PackageCheck,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem } from '../types/inventory';

interface LeftSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  areasList: string[];
  activeArea: string;
  allAreaItems: Record<string, InventoryItem[]>;
  onSelectArea: (areaName: string) => void;
  onCreateArea: (areaName: string) => void;
  onDeleteArea?: (areaName: string) => void;
  onLoadDemoData?: () => void;
  onOpenImport?: () => void;
  onForceSync: () => void;
}

const PRESET_SUGGESTIONS = [
  { name: 'Bodega Principal', icon: '🏭', desc: 'Almacén central' },
  { name: 'Recepción Entrada', icon: '🚚', desc: 'Conteo de mercancía entrante' },
  { name: 'Pasillo 1', icon: '📍', desc: 'Anaqueles y estantes' },
  { name: 'Merma y Devolución', icon: '⚠️', desc: 'Productos dañados o vencidos' },
  { name: 'Abarrotes', icon: '🥫', desc: 'Alimentos y conservas' },
  { name: 'Hogar y Limpieza', icon: '🏠', desc: 'Enseres y químicos' },
  { name: 'Ferretería', icon: '🔧', desc: 'Herramientas e insumos' },
  { name: 'Juguetes', icon: '🧸', desc: 'Categoría infantil' },
  { name: 'Ropa y Calzado', icon: '👕', desc: 'Textiles y vestimenta' },
];

export const LeftSidebarDrawer: React.FC<LeftSidebarDrawerProps> = ({
  isOpen,
  onClose,
  areasList,
  activeArea,
  allAreaItems,
  onSelectArea,
  onCreateArea,
  onDeleteArea,
  onLoadDemoData,
  onOpenImport,
  onForceSync,
}) => {
  const [newAreaName, setNewAreaName] = useState('');
  const [filterText, setFilterText] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  // Filter area names case-insensitive
  const filteredAreas = useMemo(() => {
    const q = filterText.toLowerCase().trim();
    return areasList.filter((aKey) =>
      aKey.replace(/_/g, ' ').toLowerCase().includes(q)
    );
  }, [areasList, filterText]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    onCreateArea(newAreaName.trim());
    setNewAreaName('');
  };

  const handleCreatePreset = (presetName: string) => {
    onCreateArea(presetName);
  };

  // Calculate global summary stats optimized with useMemo
  const { globalPiezas, globalValor, totalAreasCount } = useMemo(() => {
    let piezas = 0;
    let valor = 0;

    Object.entries(allAreaItems).forEach(([areaKey, items]) => {
      if (areaKey !== 'Inventario_General') {
        items.forEach((it) => {
          const pzs = Number(it.Total) || 0;
          piezas += pzs;
          valor += (Number(it.Precio) || 0) * pzs;
        });
      }
    });

    return {
      globalPiezas: piezas,
      globalValor: valor,
      totalAreasCount: areasList.length,
    };
  }, [allAreaItems, areasList]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          />

          {/* Left Slide Drawer - Larger, Prominent & Ultra-Fluid */}
          <motion.div
            drag="x"
            dragConstraints={{ left: -420, right: 0 }}
            dragElastic={{ left: 0.08, right: 0.02 }}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -70 || info.velocity.x < -180) {
                onClose();
              }
            }}
            initial={{ x: '-100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350, mass: 0.75 }}
            className="fixed top-0 bottom-0 left-0 z-50 max-w-md w-full sm:w-[420px] bg-slate-950 border-r border-blue-500/40 shadow-2xl shadow-blue-950/50 flex flex-col text-slate-100 overflow-hidden select-none will-change-transform"
          >
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/25 border border-blue-500/50 rounded-xl text-blue-400 shrink-0">
                  <Menu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                    <span>MENÚ DE ALMACENES</span>
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded shadow-sm">
                      PRO
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Selección, creación y gestión global</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar Menú"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Global Summary Card */}
            <div className="p-4 bg-slate-950 border-b border-slate-800">
              <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-blue-950/70 border border-blue-500/40 rounded-2xl p-3.5 flex flex-col gap-3 shadow-inner">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Resumen Global del Sistema</span>
                  </span>
                  <span className="text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    {totalAreasCount} Inventarios
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold block">Pzs Secundarias</span>
                    <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                      {globalPiezas.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-bold block">Valor Estimado ($)</span>
                    <span className="text-base font-black text-white font-mono mt-0.5 block">
                      ${globalValor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onForceSync();
                  }}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                >
                  <RotateCw className="w-4 h-4 text-amber-400" />
                  <span>Consolidar Todo al Inventario General</span>
                </button>
              </div>
            </div>

            {/* Filter Search & Add New Inventory */}
            <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-950">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Buscar almacén o categoría por nombre..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Form Create Custom Area */}
              <form onSubmit={handleCreateSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Nombre de nuevo inventario..."
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none placeholder-slate-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear</span>
                </button>
              </form>

              {/* Toggle preset suggestions */}
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 self-start pt-0.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{showPresets ? 'Ocultar plantillas' : 'Plantillas rápidas de inventario (+)'}</span>
              </button>

              {/* Presets grid */}
              {showPresets && (
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 max-h-48 overflow-y-auto pr-1">
                  {PRESET_SUGGESTIONS.map((preset) => {
                    const exists = areasList.includes(preset.name.replace(/\s+/g, '_'));
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          handleCreatePreset(preset.name);
                        }}
                        className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition-all ${
                          exists
                            ? 'bg-blue-950/50 border-blue-500/40 text-blue-300'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                        }`}
                        title={preset.desc}
                      >
                        <span className="text-base">{preset.icon}</span>
                        <span className="truncate w-full text-[11px]">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrollable Inventories / Areas List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Almacenes Registrados ({filteredAreas.length}):
              </span>

              <div className="flex flex-col gap-2.5">
                {filteredAreas.map((areaKey) => {
                  const isSelected = activeArea === areaKey;
                  const isGeneral = areaKey === 'Inventario_General';
                  const items = allAreaItems[areaKey] || [];

                  let totalPzs = 0;
                  let totalVal = 0;
                  items.forEach((it) => {
                    const pzs = Number(it.Total) || 0;
                    totalPzs += pzs;
                    totalVal += (Number(it.Precio) || 0) * pzs;
                  });

                  return (
                    <div
                      key={areaKey}
                      onClick={() => {
                        onSelectArea(areaKey);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-blue-500 shadow-xl shadow-blue-500/15'
                          : isGeneral
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/40'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-400 text-slate-950'
                                : isGeneral
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-bold text-sm text-white truncate">
                            {areaKey.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isGeneral && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                              General Consolidado
                            </span>
                          )}

                          {onDeleteArea && !isGeneral && areasList.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteArea(areaKey);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Eliminar Inventario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-slate-800/80 text-slate-400">
                        <span>
                          <strong className="text-white font-sans">{items.length}</strong> ítems
                        </span>
                        <span>
                          <strong className="text-emerald-400">{totalPzs.toLocaleString('es-MX')}</strong> pzs
                        </span>
                        <span>
                          <strong className="text-amber-300">
                            ${totalVal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                {onLoadDemoData && (
                  <button
                    type="button"
                    onClick={() => {
                      onLoadDemoData();
                      onClose();
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Cargar Demo</span>
                  </button>
                )}

                {onOpenImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImport();
                      onClose();
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <span>Importar Excel</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-center text-slate-400 font-mono">
                Desliza a la izquierda o toca fuera para cerrar
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
