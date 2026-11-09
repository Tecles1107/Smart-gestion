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
  Camera,
} from 'lucide-react';
import { ScanMode } from '../types/inventory';
import { validateBarcodeFormat } from '../utils/inventoryLogic';

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
  imagen?: string;
  onChangeImagen: (base64: string) => void;
  existingBatches?: { caducidad: string; total: number; bultos?: number }[];
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
  imagen,
  onChangeImagen,
  existingBatches,
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
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
              : 'bg-slate-950 text-amber-400 border-amber-500/50 hover:bg-amber-950/30'
          }`}
          title="Modo Escaneo Rápido: Autocompleta nombre al escanear SKUs ya registrados"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>⚡ Rápido: {quickScanMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Toggles with Pill Switches & Emojis matching screenshot */}
      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => onToggleCaducidad(!showCaducidad)}
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
              showCaducidad ? 'bg-rose-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                showCaducidad ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="flex items-center gap-1 text-rose-300 font-bold text-xs truncate">
            <span>⏳</span> Caducidad
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => onTogglePrecio(!showPrecio)}
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
              showPrecio ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                showPrecio ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="flex items-center gap-1 text-emerald-300 font-bold text-xs truncate">
            <span>💰</span> Precio
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => onToggleCajaMixta(!showCajaMixta)}
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
              showCajaMixta ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                showCajaMixta ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="flex items-center gap-1 text-amber-300 font-bold text-xs truncate">
            <span>📦</span> Caja Mixta
          </span>
        </label>
      </div>

      {/* Clones / Batches Detection & Helper */}
      {sku.trim().length >= 2 && existingBatches && existingBatches.length > 0 && (
        <div className="bg-slate-950/90 border border-blue-500/40 rounded-xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Lotes Detectados ({existingBatches.length})
            </span>
            <button
              type="button"
              onClick={() => {
                onToggleCaducidad(true);
                onChangeCaducidad('');
              }}
              className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md active:scale-95"
            >
              <span>+ Clonar / Nueva Caducidad</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {existingBatches.map((b, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (b.caducidad && b.caducidad !== 'Sin caducidad') {
                    onToggleCaducidad(true);
                    onChangeCaducidad(b.caducidad);
                  } else {
                    onToggleCaducidad(false);
                    onChangeCaducidad('');
                  }
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                  caducidad === b.caducidad
                    ? 'bg-blue-600/30 border-blue-400 text-white font-bold ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Haz clic para seleccionar este lote existente"
              >
                <span className="text-amber-400 font-bold">{b.caducidad || 'Sin Fecha'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-bold">{b.total} pzs</span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 italic leading-snug">
            💡 <strong>Regla de Almacén:</strong> Al ingresar una fecha de caducidad diferente se creará un clon independiente con sus propias piezas. Al ingresar la misma, se sumará al lote existente.
          </p>
        </div>
      )}

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
          <div className="flex items-center justify-between flex-wrap gap-1">
            <label htmlFor="sku-input" className="text-xs font-bold text-cyan-400 tracking-wide flex items-center gap-1.5">
              <span>SKU / CÓDIGO DE BARRAS</span>
              <span className="text-rose-400">(*)</span>
              {sku.trim().length > 0 && (() => {
                const info = validateBarcodeFormat(sku);
                return (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {info.format}
                  </span>
                );
              })()}
            </label>
            {quickScanMode && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                ⚡ Modo Rápido Activo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                id="sku-input"
                type="text"
                inputMode="numeric"
                value={sku}
                onChange={(e) => onChangeSku(e.target.value.toUpperCase())}
                placeholder={showCajaMixta ? "Código de Caja Mixta (ej. MIX-001)..." : "Escanea o escribe código..."}
                className="w-full bg-[#070e1b] border-2 border-blue-500/60 focus:border-cyan-400 rounded-lg px-3 py-2 text-base sm:text-lg font-mono font-bold text-cyan-300 tracking-wider focus:outline-none shadow-inner"
                required
                autoComplete="off"
              />
              {imagen && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden border border-cyan-400 shadow-lg">
                   <img src={imagen} className="w-full h-full object-cover" alt="" />
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('product-image-capture') as HTMLInputElement;
                input?.click();
              }}
              className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${
                sku.trim() 
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600 hover:text-white' 
                  : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
              }`}
              title="Tomar foto del producto para identificación rápida"
              disabled={!sku.trim()}
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              id="product-image-capture"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => onChangeImagen(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
        </div>

        {/* Product Name (Auto Uppercase) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre-input" className="text-xs font-bold text-cyan-400 tracking-wide">
            NOMBRE DEL ARTÍCULO (MAYÚSCULAS)
          </label>
          <input
            id="nombre-input"
            type="text"
            list="sugerencias-nombres-list"
            value={nombre}
            onChange={(e) => onChangeNombre(e.target.value.toUpperCase())}
            placeholder="DESCRIPCIÓN DEL PRODUCTO..."
            className="w-full bg-[#070e1b] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs sm:text-sm text-white uppercase focus:outline-none"
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  BULTOS / CAJAS
                </label>
                <button
                  type="button"
                  onClick={handleSoloPiezasClick}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                >
                  Solo Pz
                </button>
              </div>

              <div className="flex items-center bg-[#070e1b] rounded-lg border border-slate-700/80 p-1">
                <button
                  type="button"
                  onClick={() => onChangeBultos(Math.max(0, bultos - 1))}
                  className="w-8 h-8 rounded border border-rose-500/70 text-rose-400 font-black text-base flex items-center justify-center hover:bg-rose-950/30 active:scale-95 transition-all shrink-0"
                  title="Restar 1 bulto"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={bultos}
                  onChange={(e) => onChangeBultos(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-center font-bold text-lg text-white border-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChangeBultos(bultos + 1)}
                  className="w-8 h-8 rounded border border-emerald-500/70 text-emerald-400 font-black text-base flex items-center justify-center hover:bg-emerald-950/30 active:scale-95 transition-all shrink-0"
                  title="Sumar 1 bulto"
                >
                  +
                </button>
              </div>

              {/* Quick increment preset buttons for Bultos */}
              <div className="flex items-center gap-1 pt-0.5">
                {[1, 5, 10, 24].map((num) => (
                  <button
                    key={'bulto-plus-' + num}
                    type="button"
                    onClick={() => onChangeBultos(bultos + num)}
                    className="flex-1 py-0.5 bg-slate-950 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-emerald-400 rounded border border-slate-800 transition-colors"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>

            {/* Piezas por bulto */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  PIEZAS / BTO
                </label>
              </div>

              <div className="flex items-center bg-[#070e1b] rounded-lg border border-slate-700/80 p-1">
                <button
                  type="button"
                  onClick={() => onChangePiezas(Math.max(0, piezas - 1))}
                  className="w-8 h-8 rounded border border-rose-500/70 text-rose-400 font-black text-base flex items-center justify-center hover:bg-rose-950/30 active:scale-95 transition-all shrink-0"
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
                  className="w-full bg-transparent text-center font-bold text-lg text-white border-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChangePiezas(piezas + 1)}
                  className="w-8 h-8 rounded border border-emerald-500/70 text-emerald-400 font-black text-base flex items-center justify-center hover:bg-emerald-950/30 active:scale-95 transition-all shrink-0"
                  title="Sumar 1 pieza por bulto"
                >
                  +
                </button>
              </div>

              {/* Quick increment preset buttons for Piezas */}
              <div className="flex items-center gap-1 pt-0.5">
                {[1, 6, 12, 24, 50].map((num) => (
                  <button
                    key={'piezas-plus-' + num}
                    type="button"
                    onClick={() => onChangePiezas(piezas + num)}
                    className="flex-1 py-0.5 bg-slate-950 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-emerald-400 rounded border border-slate-800 transition-colors"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calculated Total Bar matching Termux layout */}
        <div className="flex items-center justify-between gap-3 p-2 bg-[#070e1b] border border-slate-700/80 rounded-lg">
          <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
            {showCajaMixta ? 'TOTAL PIEZAS CAJA MIXTA:' : 'TOTAL PIEZAS TANDA:'}
          </span>

          <div className="bg-[#040810] border border-slate-700 rounded-md px-4 py-1.5 min-w-[120px] text-right">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {showCajaMixta
                ? cajaMixtaSubItems.reduce((acc, s) => acc + s.piezas, 0)
                : totalCalculated}
            </span>
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
