import React, { useState } from 'react';
import { X, FolderOpen, Plus, Check, RotateCw, Trash2 } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface AreasModalProps {
  isOpen: boolean;
  onClose: () => void;
  areasList: string[];
  activeArea: string;
  allAreaItems: Record<string, InventoryItem[]>;
  onSelectArea: (areaName: string) => void;
  onCreateArea: (areaName: string) => void;
  onDeleteArea?: (areaName: string) => void;
  onForceSync: () => void;
}

const PRESET_AREAS = [
  { name: 'Hogar', icon: '🏠' },
  { name: 'Fiesta', icon: '🎉' },
  { name: 'Juguetes', icon: '🧸' },
  { name: 'Ferreteria', icon: '🔧' },
  { name: 'Ropa', icon: '👕' },
  { name: 'Abarrotes', icon: '🥫' },
];

export const AreasModal: React.FC<AreasModalProps> = ({
  isOpen,
  onClose,
  areasList,
  activeArea,
  allAreaItems,
  onSelectArea,
  onCreateArea,
  onDeleteArea,
  onForceSync,
}) => {
  const [newAreaName, setNewAreaName] = useState('');

  if (!isOpen) return null;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    onCreateArea(newAreaName.trim());
    setNewAreaName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Gestor de Áreas y Sesiones</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onForceSync}
              aria-label="Sincronizar Todo"
              className="px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              title="Sincronizar y recalcular Inventario General"
            >
              <RotateCw className="w-3 h-3" />
              <span>Sincronizar</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar Gestor de Áreas"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          {/* Quick presets */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Iniciar o cambiar a un área rápida:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AREAS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onSelectArea(preset.name)}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    activeArea === preset.name
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{preset.icon}</span>
                  <span className="truncate w-full text-center">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Create custom area input */}
          <form onSubmit={handleCreateNew} className="flex gap-2">
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Nombre de nueva área..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear</span>
            </button>
          </form>

          {/* List of existing areas with counts */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Todas las áreas registradas ({areasList.length}):
            </label>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
              {areasList.map((areaKey) => {
                const isSelected = activeArea === areaKey;
                const isGeneral = areaKey === 'Inventario_General';
                const items = allAreaItems[areaKey] || [];
                let totalPzs = 0;
                items.forEach((it) => {
                  totalPzs += Number(it.Total) || 0;
                });

                return (
                  <div
                    key={areaKey}
                    onClick={() => onSelectArea(areaKey)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-900/30'
                        : isGeneral
                        ? 'bg-emerald-950/20 hover:bg-emerald-900/30'
                        : 'hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-blue-400' : isGeneral ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{areaKey.replace(/_/g, ' ')}</span>
                          {isGeneral && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                              General Consolidado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {items.length} productos • {totalPzs} piezas
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {totalPzs} pzs
                      </span>
                      {onDeleteArea && !isGeneral && areasList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteArea(areaKey);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Eliminar Área"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
