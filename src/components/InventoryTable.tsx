import React, { useState } from 'react';
import {
  Search,
  X,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Download,
  RotateCw,
  Edit2,
  Trash2,
  Package,
  Calendar,
  DollarSign,
  ChevronDown,
  ArrowUpDown,
  CheckCircle2,
  Boxes,
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { calculatePiecesPerBundle, calculateStockHealth, SortOption } from '../utils/inventoryLogic';
import { ExportDocType, ExportFormat } from '../utils/export';

interface InventoryTableProps {
  items: InventoryItem[];
  filteredItems: InventoryItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeArea: string;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  lastRegisteredItem: InventoryItem | null;
  onConsolidate: () => void;
  onExport: (docType: ExportDocType, format: ExportFormat) => void;
  onEditItem: (itemToEdit: InventoryItem) => void;
  onDeleteItem: (itemToDelete: InventoryItem) => void;
  onChangeBultosRow: (item: InventoryItem, delta: number) => void;
  onChangePiezasRow: (item: InventoryItem, delta: number) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  filteredItems,
  searchQuery,
  onSearchChange,
  activeArea,
  sortBy,
  onSortChange,
  lastRegisteredItem,
  onConsolidate,
  onExport,
  onEditItem,
  onDeleteItem,
  onChangeBultosRow,
  onChangePiezasRow,
}) => {
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Totals calculations
  let totalBultos = 0;
  let totalPiezas = 0;
  let totalValor = 0;

  items.forEach((it) => {
    const b = Number(it.Bultos) || 0;
    const t = Number(it.Total) || 0;
    const p = Number(it.Precio) || 0;
    totalBultos += b;
    totalPiezas += t;
    totalValor += p * t;
  });

  const handleExportClick = (type: ExportDocType, format: ExportFormat) => {
    setExportDropdownOpen(false);
    onExport(type, format);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col mb-8">
      {/* PINNED HIGH-VISIBILITY CARD: Último registro capturado */}
      {lastRegisteredItem && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-b-2 border-emerald-500/60 p-3 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-sm animate-pulse">
              <CheckCircle2 className="w-3 h-3" /> ÚLTIMO REGISTRO
            </span>
            <span className="font-mono text-xs font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
              {lastRegisteredItem.Código}
            </span>
            <span className="text-xs font-bold text-white max-w-[200px] sm:max-w-md truncate">
              {lastRegisteredItem.Nombre}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">
              Bultos: <strong className="text-white font-mono">{lastRegisteredItem.Bultos}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">
              Pz/Bto: <strong className="text-cyan-300 font-mono">{calculatePiecesPerBundle(lastRegisteredItem)}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-black font-mono text-sm bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600/50">
              {lastRegisteredItem.Total} pzs
            </span>
            <span className="text-[10px] text-slate-400 ml-1 font-mono">({lastRegisteredItem.Fecha_Captura})</span>
          </div>
        </div>
      )}

      {/* Top Bar with Totals & Actions matching screenshot */}
      <div className="p-3 bg-[#0a1222] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <span className="font-bold text-white">
            Ítems: <span className="text-cyan-400 font-bold">{filteredItems.length}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-bold text-white">
            Bultos: <span className="text-cyan-400 font-bold">{totalBultos}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-bold text-white">
            Pzs: <span className="text-cyan-400 font-bold">{totalPiezas}</span>
          </span>
          {totalValor > 0 && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">
                ${totalValor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>

        {/* Action Buttons matching screenshot */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onConsolidate}
            aria-label="Consolidar a Inventario General"
            className="px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Consolidar todas las áreas en Inventario General"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Consolidar</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              aria-label="Exportar Inventario"
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {exportDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs py-1 animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setExportDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 font-bold text-[11px] text-blue-400 uppercase tracking-wider bg-slate-950/60 border-b border-slate-800">
                  Formato Básico (SKU, Nom, Total)
                </div>
                <button
                  onClick={() => handleExportClick('excel', 'basico')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx) Básico</span>
                </button>
                <button
                  onClick={() => handleExportClick('pdf', 'basico')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>PDF Básico</span>
                </button>
                <button
                  onClick={() => handleExportClick('word', 'basico')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                >
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  <span>Word (.doc) Básico</span>
                </button>

                <div className="px-3 py-1.5 font-bold text-[11px] text-emerald-400 uppercase tracking-wider bg-slate-950/60 border-y border-slate-800 mt-1">
                  Formato Completo (+ Cad / Precios)
                </div>
                <button
                  onClick={() => handleExportClick('excel', 'completo')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel (.xlsx) Completo</span>
                </button>
                <button
                  onClick={() => handleExportClick('pdf', 'completo')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>PDF Completo</span>
                </button>
                <button
                  onClick={() => handleExportClick('word', 'completo')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
                >
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  <span>Word (.doc) Completo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Sort Toolbars */}
      <div className="p-2.5 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por código, nombre, área o fecha..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" /> Ordenar:
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Ordenar inventario por"
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 w-full sm:w-auto"
          >
            <option value="defecto">Por defecto (Orden de registro)</option>
            <option value="fecha_desc">Fecha (Más reciente primero)</option>
            <option value="fecha_asc">Fecha (Más antiguo primero)</option>
            <option value="nombre_asc">Nombre (A - Z)</option>
            <option value="nombre_desc">Nombre (Z - A)</option>
            <option value="piezas_desc">Mayor cantidad de piezas</option>
            <option value="piezas_asc">Menor cantidad de piezas</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Fecha</th>
              <th className="py-2.5 px-3">Área</th>
              <th className="py-2.5 px-3">SKU / Código</th>
              <th className="py-2.5 px-3 min-w-[180px]">Nombre / Detalle</th>
              <th className="py-2.5 px-2 text-center">Bultos</th>
              <th className="py-2.5 px-2 text-center">Pzs/Bto</th>
              <th className="py-2.5 px-3 text-right">Total Pzs</th>
              <th className="py-2.5 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Package className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                  <p className="font-semibold text-slate-400">Inventario Limpio y Listo</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {searchQuery
                      ? 'Ningún artículo coincide con tu búsqueda.'
                      : 'Escanea el primer código de barras o usa el formulario para registrar artículos.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((it, idx) => {
                const b = Number(it.Bultos) || 0;
                const p = calculatePiecesPerBundle(it);
                const t = Number(it.Total) || 0;
                const precio = Number(it.Precio) || 0;
                const dif = t - b * p;
                const isNewest = lastRegisteredItem?.Código === it.Código;
                const isCajaMixta = it._extraData?.isCajaMixta || it.Nombre.includes('CAJA MIXTA');

                return (
                  <tr
                    key={idx}
                    className={`transition-colors group ${
                      isNewest
                        ? 'bg-emerald-950/20 border-l-2 border-emerald-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Fecha */}
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {it.Fecha_Captura}
                    </td>

                    {/* Área */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50">
                        {it.Área || activeArea.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Código SKU */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {it.Imagen && (
                           <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shadow-sm shrink-0">
                              <img src={it.Imagen} className="w-full h-full object-cover" alt="" />
                           </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-blue-300 tracking-wider">
                          {it.Código}
                        </span>
                        {isCajaMixta && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-500 text-slate-950 shadow">
                            MIX
                          </span>
                        )}
                        {isNewest && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-500/50">
                            NUEVO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                    {/* Nombre, salud de stock y etiquetas de caducidad/precio/subitems */}
                    <td className="py-2.5 px-3">
                      {(() => {
                        const health = calculateStockHealth(t, precio, it.Caducidad);
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-100 text-xs sm:text-sm">{it.Nombre}</span>

                              {/* Health Badge */}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border font-mono ${
                                  health.status === 'critical'
                                    ? 'bg-rose-950 text-rose-300 border-rose-500/60 animate-pulse'
                                    : health.status === 'low'
                                    ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                                    : health.status === 'excess'
                                    ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                                }`}
                                title={health.warningFlags.join(' | ') || `Salud: ${health.healthScore}%`}
                              >
                                {health.status === 'critical'
                                  ? '🔴 CRÍTICO'
                                  : health.status === 'low'
                                  ? '🟡 STOCK BAJO'
                                  : health.status === 'excess'
                                  ? '🔵 SOBRESTOCK'
                                  : '🟢 ÓPTIMO'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {it.Caducidad && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/40">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>{it.Caducidad}</span>
                                </span>
                              )}
                              {it._extraData?.estadoCaducidad && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <span>⏰ {it._extraData.estadoCaducidad}</span>
                                </span>
                              )}
                              {it._extraData?.originalArea && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                  <span>De: {it._extraData.originalArea.replace(/_/g, ' ')}</span>
                                </span>
                              )}
                              {precio > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                                  <DollarSign className="w-2.5 h-2.5" />
                                  <span>${precio.toFixed(2)}</span>
                                </span>
                              )}
                              {isCajaMixta && it._extraData?.subItems && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/60 font-mono">
                                  <Boxes className="w-3 h-3 text-purple-400" />
                                  <span>{it._extraData.subItems.length} sub-items</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Display sub-items list for Caja Mixta directly in table row */}
                      {isCajaMixta && it._extraData?.subItems && (
                        <div className="mt-1.5 bg-slate-950/80 border border-purple-950 rounded p-1.5 space-y-1 max-w-md">
                          {it._extraData.subItems.map((sub: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center justify-between text-[11px] text-slate-300 border-b border-slate-900 last:border-0 pb-0.5">
                              <span className="font-mono text-purple-300 font-bold">{sub.codigo}</span>
                              <span className="truncate max-w-[160px]">{sub.nombre}</span>
                              <span className="font-mono text-emerald-400 font-bold">{sub.piezas} pzs</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Bultos */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 shadow-inner">
                        <button
                          type="button"
                          onClick={() => onChangeBultosRow(it, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs flex items-center justify-center transition-colors active:scale-95"
                          title="Restar 1 bulto"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-white px-2 text-xs">
                          {b}
                        </span>
                        <button
                          type="button"
                          onClick={() => onChangeBultosRow(it, 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center transition-colors active:scale-95"
                          title="Sumar 1 bulto"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Piezas por bulto */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 shadow-inner">
                        <button
                          type="button"
                          onClick={() => onChangePiezasRow(it, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs flex items-center justify-center transition-colors active:scale-95"
                          title="Restar 1 pieza"
                        >
                          -
                        </button>
                        <span className="font-mono text-cyan-300 px-1.5 text-xs">
                          {p}
                        </span>
                        <button
                          type="button"
                          onClick={() => onChangePiezasRow(it, 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center transition-colors active:scale-95"
                          title="Sumar 1 pieza"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Total Piezas */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className="font-mono font-black text-base text-emerald-400">
                        {t}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-0.5">pz</span>
                    </td>

                    {/* Acciones Editar / Eliminar */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEditItem(it)}
                          aria-label={`Editar registro ${it.Código}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-400 border border-slate-700 transition-colors"
                          title="Editar Registro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(it)}
                          aria-label={`Eliminar registro ${it.Código}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 border border-slate-700 transition-colors"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
