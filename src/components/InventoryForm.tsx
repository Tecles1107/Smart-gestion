import React, { useRef, useState } from 'react';
import {
  PlusCircle,
  MinusCircle,
  Search,
  Calendar,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Boxes,
  Trash2,
  Zap,
} from 'lucide-react';
import { ScanMode } from '../types/inventory';

interface SubItem {
  codigo: string;
  nombre: string;
  piezas: number;
}

interface InventoryFormProps {
  mode: ScanMode;
  onChangeMode: (mode: ScanMode) => void;
  sku: string;
  onChangeSku: (sku: string) => void;
  nombre: string;
  onChangeNombre: (nombre: string) => void;
  bultos: number;
  onChangeBultos: (bultos: number) => void;
  piezas: number;
  onChangePiezas: (piezas: number) => void;
  totalCalculated: number;
  showCaducidad: boolean;
  onToggleCaducidad: (show: boolean) => void;
  caducidad: string;
  onChangeCaducidad: (caducidad: string) => void;
  showPrecio: boolean;
  onTogglePrecio: (show: boolean) => void;
  precio: number;
  onChangePrecio: (precio: number) => void;
  // Caja Mixta props
  showCajaMixta: boolean;
  onToggleCajaMixta: (show: boolean) => void;
  cajaMixtaSubItems: SubItem[];
  onAddCajaMixtaSubItem: (item: SubItem) => void;
  onRemoveCajaMixtaSubItem: (index: number) => void;
  // Quick scan mode
  quickScanMode: boolean;
  onToggleQuickScanMode: (val: boolean) => void;
  knownNames: string[];
  onSubmit: (e: React.FormEvent) => void;
  onSoloPiezas: () => void;
}

export const InventoryForm: React.FC<InventoryFormProps> = ({
  mode,
  onChangeMode,
  sku,
  onChangeSku,
  nombre,
  onChangeNombre,
  bultos,
  onChangeBultos,
  piezas,
  onChangePiezas,
  totalCalculated,
  showCaducidad,
  onToggleCaducidad,
  caducidad,
  onChangeCaducidad,
  showPrecio,
  onTogglePrecio,
  precio,
  onChangePrecio,
  showCajaMixta,
  onToggleCajaMixta,
  cajaMixtaSubItems,
  onAddCajaMixtaSubItem,
  onRemoveCajaMixtaSubItem,
  quickScanMode,
  onToggleQuickScanMode,
  knownNames,
  onSubmit,
  onSoloPiezas,
}) => {
  const piezasInputRef = useRef<HTMLInputElement>(null);
  const [subSku, setSubSku] = useState('');
  const [subNombre, setSubNombre] = useState('');
  const [subPiezas, setSubPiezas] = useState(1);

  const handleSoloPiezasClick = () => {
    onSoloPiezas();
    setTimeout(() => {
      piezasInputRef.current?.focus();
      piezasInputRef.current?.select();
    }, 50);
  };

  const handleAddSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subSku.trim()) return;
    onAddCajaMixtaSubItem({
      codigo: subSku.trim(),
      nombre: (subNombre.trim() || 'PRODUCTO MIXTO').toUpperCase(),
      piezas: Math.max(1, subPiezas),
    });
    setSubSku('');
    setSubNombre('');
    setSubPiezas(1);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-3 sm:p-4 flex flex-col gap-3">
      {/* Mode Selector Segmented Tabs & Quick Scan Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 flex-1 w-full">
          <button
            type="button"
            onClick={() => onChangeMode('entrada')}
            aria-label="Modo Entrada"
            className={`py-2 px-1 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              mode === 'entrada'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Entrada (+)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('salida')}
            aria-label="Modo Salida"
            className={`py-2 px-1 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              mode === 'salida'
                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Salida (-)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('consulta')}
            aria-label="Modo Auditoría"
            className={`py-2 px-1 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              mode === 'consulta'
                ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Auditoría</span>
          </button>
        </div>

        {/* Quick Scan Mode Toggle */}
        <button
          type="button"
          onClick={() => onToggleQuickScanMode(!quickScanMode)}
          aria-label="Modo Escaneo Rápido"
          className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
            quickScanMode
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md animate-pulse'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title="Modo Escaneo Rápido: Autocompleta nombre al escanear SKUs ya registrados"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Escaneo Rápido</span>
        </button>
      </div>

      {/* Toggles: Caducidad, Precio, Caja Mixta */}
      <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCaducidad}
            onChange={(e) => onToggleCaducidad(e.target.checked)}
            className="w-4 h-4 rounded text-rose-500 focus:ring-0 bg-slate-800 border-slate-700"
          />
          <span className="flex items-center gap-1 text-rose-300 font-semibold truncate">
            <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Caducidad</span>
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPrecio}
            onChange={(e) => onTogglePrecio(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-800 border-slate-700"
          />
          <span className="flex items-center gap-1 text-emerald-300 font-semibold truncate">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Precio</span>
          </span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCajaMixta}
            onChange={(e) => onToggleCajaMixta(e.target.checked)}
            className="w-4 h-4 rounded text-purple-500 focus:ring-0 bg-slate-800 border-slate-700"
          />
          <span className="flex items-center gap-1 text-purple-300 font-semibold truncate">
            <Boxes className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Caja Mixta</span>
          </span>
        </label>
      </div>

      {/* Conditional Extra Fields */}
      {(showCaducidad || showPrecio) && (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
          {showCaducidad && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha Vencimiento
              </label>
              <input
                type="date"
                value={caducidad}
                onChange={(e) => onChangeCaducidad(e.target.value)}
                className="w-full bg-slate-950 border border-rose-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>
          )}

          {showPrecio && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Precio Unitario ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precio || ''}
                onChange={(e) => onChangePrecio(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          )}
        </div>
      )}

      {/* Caja Mixta Sub-Items Builder Section */}
      {showCajaMixta && (
        <div className="bg-purple-950/30 border border-purple-500/50 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-purple-400" />
              <span>Configuración de Caja Mixta (Bulto = 1)</span>
            </span>
            <span className="text-[10px] bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded font-mono">
              {cajaMixtaSubItems.length} productos dentro
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-end">
            <div className="sm:col-span-4 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-semibold">SKU Sub-item</label>
              <input
                type="text"
                value={subSku}
                onChange={(e) => setSubSku(e.target.value.toUpperCase())}
                placeholder="Código..."
                className="bg-slate-950 border border-purple-800/60 rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
            <div className="sm:col-span-5 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-semibold">Nombre Producto</label>
              <input
                type="text"
                value={subNombre}
                onChange={(e) => setSubNombre(e.target.value.toUpperCase())}
                placeholder="Descripción..."
                className="bg-slate-950 border border-purple-800/60 rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-semibold">Piezas</label>
              <input
                type="number"
                min="1"
                value={subPiezas}
                onChange={(e) => setSubPiezas(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-950 border border-purple-800/60 rounded px-2 py-1 text-xs text-white text-center font-mono"
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="button"
                onClick={handleAddSubItem}
                className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs flex items-center justify-center"
                title="Agregar producto a caja mixta"
              >
                +
              </button>
            </div>
          </div>

          {cajaMixtaSubItems.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 mt-1 border-t border-purple-900/50 pt-2">
              {cajaMixtaSubItems.map((sub, sIdx) => (
                <div key={sIdx} className="flex items-center justify-between bg-slate-950 px-2.5 py-1 rounded border border-purple-900/40 text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-purple-300 font-bold">{sub.codigo}</span>
                    <span className="text-slate-200 truncate">{sub.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{sub.piezas} pzs</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCajaMixtaSubItem(sIdx)}
                      className="text-rose-400 hover:text-rose-300 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {/* SKU / Code */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="sku-input" className="text-xs font-bold text-slate-300">
              SKU / CÓDIGO DE BARRAS <span className="text-rose-400">*</span>
            </label>
            {quickScanMode && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                ⚡ Modo Escaneo Rápido Activado
              </span>
            )}
          </div>
          <input
            id="sku-input"
            type="text"
            inputMode="numeric"
            value={sku}
            onChange={(e) => onChangeSku(e.target.value.toUpperCase())}
            placeholder={showCajaMixta ? "Código de Caja Mixta (ej. MIX-001)..." : "Escanea o escribe código..."}
            className="w-full bg-slate-950 border-2 border-blue-500/60 focus:border-blue-400 rounded-lg px-3 py-2 text-base sm:text-lg font-mono font-bold text-blue-300 tracking-wider focus:outline-none shadow-inner"
            required
            autoComplete="off"
          />
        </div>

        {/* Product Name (Auto Uppercase) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre-input" className="text-xs font-bold text-slate-300">
            NOMBRE DEL ARTÍCULO
          </label>
          <input
            id="nombre-input"
            type="text"
            list="sugerencias-nombres-list"
            value={nombre}
            onChange={(e) => onChangeNombre(e.target.value.toUpperCase())}
            placeholder="Descripción o nombre del producto..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-slate-500 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-white uppercase focus:outline-none"
            autoComplete="off"
          />
          <datalist id="sugerencias-nombres-list">
            {knownNames.map((name, i) => (
              <option key={i} value={name} />
            ))}
          </datalist>
        </div>

        {/* Bultos and Piezas Grid */}
        {!showCajaMixta && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Bultos input with quick +/- buttons */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-slate-400" /> BULTOS / CAJAS
                </label>
                <button
                  type="button"
                  onClick={handleSoloPiezasClick}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2"
                >
                  Solo Pz
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangeBultos(Math.max(0, bultos - 1))}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 font-black text-base flex items-center justify-center active:scale-95 transition-all"
                  title="Restar 1 bulto"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={bultos}
                  onChange={(e) => onChangeBultos(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-center font-bold text-base sm:text-lg text-white border-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChangeBultos(bultos + 1)}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center active:scale-95 transition-all"
                  title="Sumar 1 bulto"
                >
                  +
                </button>
              </div>
            </div>

            {/* Piezas por bulto */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> PIEZAS / BTO
                </label>
                <span className="text-[10px] text-slate-500 font-mono">u/caja</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangePiezas(Math.max(0, piezas - 1))}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 font-black text-base flex items-center justify-center active:scale-95 transition-all"
                  title="Restar 1 pieza por bulto"
                >
                  -
                </button>
                <input
                  ref={piezasInputRef}
                  type="number"
                  min="0"
                  value={piezas}
                  onChange={(e) => onChangePiezas(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-center font-bold text-base sm:text-lg text-blue-400 border-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChangePiezas(piezas + 1)}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center active:scale-95 transition-all"
                  title="Sumar 1 pieza por bulto"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calculated Total Bar */}
        <div className="p-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {showCajaMixta ? 'Total Piezas Caja Mixta:' : 'Total Piezas Tanda:'}
            </span>
            <span className="text-[10px] text-slate-500">
              {showCajaMixta
                ? `${cajaMixtaSubItems.length} productos configurados`
                : bultos > 0
                ? `${bultos} bultos × ${piezas} pzs`
                : `${piezas} piezas sueltas`}
            </span>
          </div>

          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
              {showCajaMixta
                ? cajaMixtaSubItems.reduce((acc, s) => acc + s.piezas, 0)
                : totalCalculated}
            </span>
            <span className="text-xs text-slate-400 ml-1">pzs</span>
          </div>
        </div>

        {/* Big Action Submit Button */}
        {mode === 'consulta' ? (
          <button
            type="submit"
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            <span>Consultar Auditoría Global</span>
          </button>
        ) : mode === 'salida' ? (
          <button
            type="submit"
            className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
          >
            <MinusCircle className="w-5 h-5" />
            <span>Restar del Inventario</span>
          </button>
        ) : (
          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{showCajaMixta ? 'Guardar Caja Mixta [MIX]' : 'Sumar al Inventario'}</span>
          </button>
        )}
      </form>
    </div>
  );
};
