import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Camera, Image as ImageIcon } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { calculateTotal } from '../utils/inventoryLogic';

interface EditItemModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: InventoryItem) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [bultos, setBultos] = useState(0);
  const [piezas, setPiezas] = useState(0);
  const [caducidad, setCaducidad] = useState('');
  const [precio, setPrecio] = useState(0);
  const [imagen, setImagen] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (item) {
      setNombre(item.Nombre || '');
      setBultos(Number(item.Bultos) || 0);
      setPiezas(Number(item.Piezas) || 1);
      setCaducidad(item.Caducidad || '');
      setPrecio(Number(item.Precio) || 0);
      setImagen(item.Imagen);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const totalCalculated = calculateTotal(bultos, piezas);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...item,
      Nombre: nombre.trim() || 'S/N',
      Bultos: Math.max(0, bultos),
      Piezas: Math.max(1, piezas),
      Total: totalCalculated,
      Caducidad: caducidad,
      Precio: Math.max(0, precio),
      Imagen: imagen,
      Fecha_Captura: item.Fecha_Captura.includes('(Ed)')
        ? item.Fecha_Captura
        : `${item.Fecha_Captura} (Ed)`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-blue-500/50 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Editar Registro de Inventario</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de edición"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-xs overflow-y-auto max-h-[80vh]">
          {/* SKU read-only */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SKU / Código (Bloqueado):
            </label>
            <input
              type="text"
              value={item.Código}
              readOnly
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-blue-400 text-sm cursor-not-allowed"
            />
          </div>

          {/* Image Editor Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Imagen del Producto:
            </label>
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
               <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                 {imagen ? (
                   <img src={imagen} className="w-full h-full object-cover" alt="" />
                 ) : (
                   <ImageIcon className="w-8 h-8 text-slate-700" />
                 )}
               </div>
               <div className="flex flex-col gap-2">
                 <button
                   type="button"
                   onClick={() => document.getElementById('edit-image-capture')?.click()}
                   className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/40 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition-all"
                 >
                   <Camera className="w-4 h-4" />
                   <span>{imagen ? 'Cambiar Foto' : 'Tomar Foto'}</span>
                 </button>
                 {imagen && (
                    <button
                      type="button"
                      onClick={() => setImagen(undefined)}
                      className="text-[10px] text-rose-400 font-bold hover:underline self-start"
                    >
                      Quitar imagen
                    </button>
                 )}
                 <input 
                   id="edit-image-capture"
                   type="file" 
                   accept="image/*" 
                   capture="environment" 
                   className="hidden"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       const reader = new FileReader();
                       reader.onloadend = () => setImagen(reader.result as string);
                       reader.readAsDataURL(file);
                     }
                   }}
                 />
               </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Nombre / Descripción:
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
              required
            />
          </div>

          {/* Bultos and Piezas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Bultos:
              </label>
              <input
                type="number"
                min="0"
                value={bultos}
                onChange={(e) => setBultos(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs text-center font-bold font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Piezas / Bulto:
              </label>
              <input
                type="number"
                min="1"
                value={piezas}
                onChange={(e) => setPiezas(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-blue-300 text-xs text-center font-bold font-mono"
              />
            </div>
          </div>

          {/* Caducidad and Precio */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                Caducidad:
              </label>
              <input
                type="date"
                value={caducidad}
                onChange={(e) => setCaducidad(e.target.value)}
                className="w-full bg-slate-950 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Precio Unit ($):
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          {/* Total Display */}
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400">Total Piezas Resultante:</span>
            <span className="font-mono font-bold text-base text-emerald-400">{totalCalculated} pzs</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
