import React, { useState, useMemo, useRef } from 'react';
import {
  Settings,
  X,
  History,
  Trash2,
  Calendar,
  Search,
  Camera,
  Image as ImageIcon,
  Check,
  ChevronRight,
  BarChart3,
  AlertOctagon,
  Clock,
  Filter,
  FileText,
  Upload,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  AlertTriangle,
  Download,
  Square,
  CheckSquare,
  Zap,
  Terminal,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Sparkles,
  Copy,
  FolderTree,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  FolderOpen,
  Save,
  Wifi,
  WifiOff,
  CloudUpload,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, MermaRecord, MermaStatus } from '../types/inventory';
import { calculateStockHealth } from '../utils/inventoryLogic';
import { CameraScanner } from './CameraScanner';
import { exportMermaRecords, MermaExportType } from '../utils/exportMerma';
import { UserManual } from './UserManual';
import { SoftwareUpdateCenter } from './SoftwareUpdateCenter';

interface RightSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allAreaItems: Record<string, InventoryItem[]>;
  onUpdateItem: (area: string, item: InventoryItem) => void;
  onDeleteAreaItem: (area: string, item: InventoryItem) => void;
  onApproveMerma?: (record: MermaRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isBackendConnected?: boolean;
  isOnline?: boolean;
  pendingSyncCount?: number;
  activeArea?: string;
  onOpenImport?: () => void;
  onOpenAreas?: () => void;
  onForceSync?: () => void;
  onLoadDemoData?: () => void;
  onManualSave?: () => void;
  onCheckBackendConnection?: () => void;
  initialView?: ViewType;
}

type ViewType = 'menu' | 'merma' | 'caducados' | 'historial' | 'buscador' | 'termux' | 'diagnostico' | 'configuracion' | 'manual' | 'updates';
type HistoryFilter = 'day' | 'week' | 'month' | 'year' | 'all';

// --- SUB-COMPONENTES DE ENRUTAMIENTO INTERNO ---

// --- SUB-COMPONENTES DE ENRUTAMIENTO INTERNO ---

const MermaView: React.FC<{ 
  items: { area: string; item: InventoryItem }[]; 
  onSaveMerma: (record: MermaRecord) => void;
  onUpdateStatus: (id: string, nextStatus: MermaStatus) => void;
  onDeleteMerma: (id: string) => void;
  mermaRecords: MermaRecord[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ items, onSaveMerma, onUpdateStatus, onDeleteMerma, mermaRecords, showToast }) => {
  const [subMode, setSubMode] = useState<'list' | 'add' | 'history'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [confirmingRecord, setConfirmingRecord] = useState<MermaRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const waitingMermas = mermaRecords.filter(r => r.status === 'espera' || r.status === 'validado');
  const approvedMermas = mermaRecords.filter(r => r.status === 'aprobado');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const list = subMode === 'list' ? waitingMermas : approvedMermas;
    if (selectedIds.length === list.length) setSelectedIds([]);
    else setSelectedIds(list.map(r => r.id));
  };

  const handleExport = (type: MermaExportType) => {
    const list = subMode === 'list' ? waitingMermas : approvedMermas;
    const toExport = selectedIds.length > 0 ? list.filter(r => selectedIds.includes(r.id)) : list;
    
    if (toExport.length === 0) {
      showToast("No hay registros para exportar", "error");
      return;
    }

    showToast(`Generando reporte ${type.toUpperCase()}...`, "info");
    
    setTimeout(() => {
      try {
        exportMermaRecords(toExport, type);
        showToast("Reporte generado con éxito", "success");
      } catch (err) {
        showToast("Error al generar el reporte", "error");
        console.error(err);
      }
    }, 500);

    setShowExportMenu(false);
  };

  const handleBatchApprove = () => {
     selectedIds.forEach(id => onUpdateStatus(id, 'validado'));
     setSelectedIds([]);
  };

  return (
    <motion.div key="merma" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 h-full min-h-screen">
      {/* Merma Header & Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800 self-start">
          <button onClick={() => { setSubMode('list'); setSelectedIds([]); }} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${subMode === 'list' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Solicitudes</button>
          <button onClick={() => { setSubMode('add'); setSelectedIds([]); }} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${subMode === 'add' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Capturar Merma</button>
          <button onClick={() => { setSubMode('history'); setSelectedIds([]); }} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${subMode === 'history' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Aprobadas</button>
        </div>

        {subMode !== 'add' && (
          <div className="flex items-center gap-2 relative">
            {selectedIds.length > 0 && subMode === 'list' && (
              <button 
                onClick={handleBatchApprove}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase flex items-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" /> Validar ({selectedIds.length})
              </button>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[11px] font-black uppercase flex items-center gap-2 border border-slate-700 shadow-xl"
              >
                <Download className="w-4 h-4" /> Descargar Reporte
                <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <button onClick={() => handleExport('excel')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-300 hover:bg-emerald-600 hover:text-white flex items-center gap-3 transition-colors border-b border-slate-800">
                      <FileText className="w-4 h-4" /> Formato Excel
                    </button>
                    <button onClick={() => handleExport('pdf')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-300 hover:bg-rose-600 hover:text-white flex items-center gap-3 transition-colors border-b border-slate-800">
                      <FileText className="w-4 h-4" /> Formato PDF
                    </button>
                    <button onClick={() => handleExport('word')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-3 transition-colors">
                      <FileText className="w-4 h-4" /> Formato Word
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {subMode === 'add' ? (
          <AddMermaForm 
            key="add-form"
            onSave={(rec) => { onSaveMerma(rec); setSubMode('list'); }} 
            inventoryItems={items}
          />
        ) : (
          <motion.div key={subMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 overflow-x-auto">
             <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                         <th className="px-4 py-4 w-12 text-center">
                            <button onClick={selectAll} className="text-blue-500 hover:text-blue-400">
                               {selectedIds.length === (subMode === 'list' ? waitingMermas : approvedMermas).length && selectedIds.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                         </th>
                         <th className="px-4 py-4">Evidencia</th>
                         <th className="px-4 py-4">Producto</th>
                         <th className="px-4 py-4">Área / Almacén</th>
                         <th className="px-4 py-4">UPC / SKU</th>
                         <th className="px-4 py-4 text-center">Cant.</th>
                         <th className="px-4 py-4">Motivo</th>
                         <th className="px-4 py-4 text-center">Estatus</th>
                         <th className="px-4 py-4 text-right">Acciones</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                      {(subMode === 'list' ? waitingMermas : approvedMermas).length === 0 ? (
                        <tr>
                           <td colSpan={9} className="py-20 text-center text-slate-600 font-bold">
                              No hay registros en esta sección
                           </td>
                        </tr>
                      ) : (subMode === 'list' ? waitingMermas : approvedMermas).map(rec => (
                        <tr key={rec.id} className={`hover:bg-slate-800/30 transition-colors group ${selectedIds.includes(rec.id) ? 'bg-blue-600/5' : ''}`}>
                           <td className="px-4 py-4 text-center">
                              <button onClick={() => toggleSelect(rec.id)} className={`${selectedIds.includes(rec.id) ? 'text-blue-500' : 'text-slate-700 group-hover:text-slate-500'}`}>
                                 {selectedIds.includes(rec.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </button>
                           </td>
                           <td className="px-4 py-4">
                              <div 
                                onClick={() => rec.evidencia && setPreviewImage(rec.evidencia)}
                                className={`w-12 h-12 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center shrink-0 shadow-lg ${rec.evidencia ? 'cursor-pointer hover:border-cyan-400 hover:scale-105 transition-all' : ''}`}
                                title={rec.evidencia ? "Haz clic para ver foto ampliada" : "Sin foto"}
                              >
                                 {rec.evidencia ? <img src={rec.evidencia} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-5 h-5 text-slate-800" />}
                              </div>
                           </td>
                           <td className="px-4 py-4">
                              <p className="text-xs font-black text-slate-100 uppercase leading-tight line-clamp-2">{rec.nombre}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{rec.responsable}</p>
                           </td>
                           <td className="px-4 py-4">
                              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded-lg font-bold uppercase tracking-tighter border border-slate-800">
                                 {rec.area?.replace(/_/g, ' ') || 'SIN ÁREA'}
                              </span>
                           </td>
                           <td className="px-4 py-4">
                              <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-500/20">{rec.sku}</span>
                           </td>
                           <td className="px-4 py-4 text-center">
                              <span className="text-sm font-black text-rose-400 font-mono">{rec.cantidad}</span>
                           </td>
                           <td className="px-4 py-4">
                              <p className="text-[11px] text-slate-400 italic line-clamp-2 max-w-[200px] leading-tight">"{rec.motivo || 'Sin descripción'}"</p>
                           </td>
                           <td className="px-4 py-4 text-center">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${rec.status === 'espera' ? 'bg-slate-800 text-slate-400' : rec.status === 'validado' ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 animate-pulse' : 'bg-emerald-600 text-white'}`}>
                                 {rec.status}
                              </span>
                           </td>
                           <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 {subMode === 'list' && (
                                    <>
                                       {rec.status === 'espera' ? (
                                          <button 
                                            onClick={() => onUpdateStatus(rec.id, 'validado')} 
                                            className="px-2.5 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-90 text-[10px] font-bold flex items-center gap-1" 
                                            title="Pre-aprobar y validar solicitud"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Pre-aprobar</span>
                                          </button>
                                       ) : (
                                          <button 
                                            onClick={() => setConfirmingRecord(rec)} 
                                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all shadow-md active:scale-90 text-[10px] font-black flex items-center gap-1 shadow-emerald-900/30" 
                                            title="Aprobar Definitivamente y Descontar de Inventario"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Aprobar</span>
                                          </button>
                                       )}
                                    </>
                                 )}
                                 <button onClick={() => onDeleteMerma(rec.id)} className="p-2 bg-rose-600/10 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all shadow-md active:scale-90" title="Eliminar Registro"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE ADVERTENCIA PARA APROBACIÓN FINAL DE MERMA */}
      <AnimatePresence>
        {confirmingRecord && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-900/20">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-black text-white uppercase tracking-tight">¿Desea Confirmar la Aprobación?</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Estás a punto de aprobar la merma del producto <strong className="text-white">{confirmingRecord.nombre}</strong> ({confirmingRecord.cantidad} piezas). 
                  Se descontará de forma definitiva del inventario físico y pasará al historial de mermas aprobadas.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left text-xs font-mono flex flex-col gap-1 text-slate-300">
                <div><span className="text-slate-500">UPC/SKU:</span> {confirmingRecord.sku}</div>
                <div><span className="text-slate-500">ÁREA:</span> {confirmingRecord.area?.replace(/_/g, ' ') || 'GENERAL'}</div>
                <div><span className="text-slate-500">SOLICITANTE:</span> {confirmingRecord.responsable}</div>
                <div><span className="text-slate-500">MOTIVO:</span> {confirmingRecord.motivo}</div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(confirmingRecord.id, 'aprobado');
                    setConfirmingRecord(null);
                    showToast('Merma aprobada y descontada del inventario', 'success');
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                >
                  Sí, Confirmar y Aprobar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRecord(null)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE FOTO DE EVIDENCIA AMPLIADA */}
      <AnimatePresence>
        {previewImage && (
          <div 
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Evidencia Fotográfica
                </span>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[70vh]">
                <img src={previewImage} alt="Evidencia" className="max-w-full max-h-[65vh] object-contain rounded-xl" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AddMermaForm: React.FC<{ onSave: (r: MermaRecord) => void, inventoryItems: { area: string; item: InventoryItem }[] }> = ({ onSave, inventoryItems }) => {
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    cantidad: 1,
    motivo: '',
    responsable: '',
    evidencia: '',
    area: ''
  });
  const [showScanner, setShowScanner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleScan = (code: string) => {
    const found = inventoryItems.find(i => i.item.Código === code);
    setFormData(prev => ({
      ...prev,
      sku: code,
      nombre: found ? found.item.Nombre : prev.nombre,
      area: found ? found.area : prev.area
    }));
    setShowScanner(false);
  };

  const captureEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, evidencia: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.responsable || !formData.area) return;
    onSave({
      id: `MERMA-${Date.now()}`,
      fecha: new Date().toLocaleString('es-MX'),
      ...formData,
      status: 'espera'
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
      <h5 className="text-sm font-black text-white mb-6 uppercase tracking-tighter">Captura de Nueva Evidencia de Merma</h5>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código de Producto</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={formData.sku} 
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  const found = inventoryItems.find(i => i.item.Código === val);
                  setFormData(prev => ({
                    ...prev,
                    sku: val,
                    nombre: found ? found.item.Nombre : prev.nombre,
                    area: found ? found.area : prev.area
                  }));
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400 font-bold"
                placeholder="Escanea o escribe..."
              />
              <button type="button" onClick={() => setShowScanner(true)} className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/40"><Camera className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsable</label>
            <input 
              type="text" 
              required
              value={formData.responsable} 
              onChange={e => setFormData({...formData, responsable: e.target.value.toUpperCase()})}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              placeholder="Nombre del solicitante..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <input 
            type="text" 
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value.toUpperCase()})}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            placeholder="Descripción automática..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Almacén / Área de Origen</label>
          <select 
            value={formData.area} 
            onChange={e => setFormData({...formData, area: e.target.value})}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-bold"
            required
          >
            <option value="">Selecciona área...</option>
            {Array.from(new Set(inventoryItems.map(i => i.area))).map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cantidad (Pzs)</label>
            <input 
              type="number" 
              min="1"
              value={formData.cantidad} 
              onChange={e => setFormData({...formData, cantidad: parseInt(e.target.value) || 1})}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-rose-400"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Foto de Evidencia / Daño</label>
            <div className="flex gap-3 items-center">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-700">
                <ImageIcon className="w-4 h-4" /> {formData.evidencia ? 'Cambiar Foto' : 'Adjuntar Evidencia'}
              </button>
              {formData.evidencia && <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/50"><img src={formData.evidencia} className="w-full h-full object-cover" alt="" /></div>}
            </div>
            <input type="file" ref={fileRef} accept="image/*" capture="environment" className="hidden" onChange={captureEvidence} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motivo de Merma (Descripción)</label>
          <textarea 
            rows={3}
            value={formData.motivo} 
            onChange={e => setFormData({...formData, motivo: e.target.value.toUpperCase()})}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            placeholder="Describe el daño o causa del vencimiento..."
          />
        </div>

        <button type="submit" className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-900/30 uppercase tracking-widest mt-2 active:scale-95 transition-all">Registrar Solicitud de Merma</button>
      </form>

      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-800">
               <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-white">ESCÁNER EXCLUSIVO MERMA</span>
                  <button onClick={() => setShowScanner(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
               </div>
               <div className="p-4">
                 <CameraScanner onScanCode={handleScan} isPaused={false} lastScannedCode={null} onResumeScan={() => {}} onDiscardCode={() => {}} />
               </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MermaAdminCard: React.FC<{ record: MermaRecord, onUpdate: (id: string, s: MermaStatus) => void, onDelete: (id: string) => void, readonly?: boolean }> = ({ record, onUpdate, onDelete, readonly }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className={`relative bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-xl group transition-all ${record.status === 'validado' ? 'border-amber-500/40 ring-1 ring-amber-500/20' : ''}`}>
      {record.status === 'validado' && !readonly && (
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[9px] font-black px-3 py-0.5 rounded-full shadow-lg flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> CONFIRMACIÓN REQUERIDA
         </div>
      )}

      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-800 shrink-0 bg-slate-900 flex items-center justify-center">
          {record.evidencia ? <img src={record.evidencia} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-8 h-8 text-slate-800" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${record.status === 'espera' ? 'bg-slate-800 text-slate-400' : record.status === 'validado' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {record.status}
             </span>
             <span className="text-[9px] font-mono text-slate-600">{record.id}</span>
          </div>
          <p className="text-sm font-black text-white uppercase truncate mt-1">{record.nombre}</p>
          <p className="text-[10px] text-blue-400 font-mono font-bold">{record.sku}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{record.fecha}</p>
        </div>
      </div>

      <div className="bg-slate-900/40 p-3 rounded-2xl flex flex-col gap-2">
         <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Solicitante:</span>
            <span className="text-xs text-white font-black">{record.responsable}</span>
         </div>
         <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Cantidad:</span>
            <span className="text-sm text-rose-400 font-black">{record.cantidad} PZS</span>
         </div>
         <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 mt-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Motivo / Descripción:</span>
            <p className="text-[10px] text-slate-300 italic line-clamp-2 leading-tight">"{record.motivo || 'SIN DESCRIPCIÓN'}"</p>
         </div>
      </div>

      {!readonly && (
        <div className="flex gap-2">
          {record.status === 'espera' ? (
            <button onClick={() => onUpdate(record.id, 'validado')} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 shadow-lg">Pre-Aprobar</button>
          ) : (
            <button onClick={() => setShowConfirm(true)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 shadow-lg">Aprobar Definitivamente</button>
          )}
          <button onClick={() => onDelete(record.id)} className="p-2.5 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}

      {showConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 bg-slate-950/95 rounded-3xl p-5 flex flex-col items-center justify-center text-center backdrop-blur-md">
           <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
           <p className="text-xs font-black text-white uppercase leading-tight">¿Confirmar Aprobación Final?</p>
           <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">El producto será eliminado del inventario físico y pasará al historial de mermas aprobadas.</p>
           <div className="flex gap-2 w-full mt-4">
              <button onClick={() => { onUpdate(record.id, 'aprobado'); setShowConfirm(false); }} className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl">Confirmar</button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-xl">Cancelar</button>
           </div>
        </motion.div>
      )}
    </div>
  );
};

const CaducadosView: React.FC<{ items: { area: string; item: InventoryItem }[]; triggerImage: (a: string, i: InventoryItem) => void; deleteItem: (a: string, i: InventoryItem) => void }> = ({ items, triggerImage, deleteItem }) => (
  <motion.div key="caducados" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Control de Caducidad
        </h4>
        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Productos próximos a vencer o vencidos</p>
      </div>
      <span className="text-sm font-black bg-amber-600 text-white px-4 py-1.5 rounded-2xl">{items.length} Alertas</span>
    </div>
    {items.length === 0 ? (
       <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-16 text-center shadow-inner">
         <Check className="w-16 h-16 text-emerald-500 mx-auto mb-4 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
         <p className="text-lg font-black text-slate-200">Todo Vigente</p>
       </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(({ area, item }, i) => (
          <InventoryCard key={i} area={area} item={item} status="CADUCIDAD" color="amber" triggerImage={triggerImage} deleteItem={deleteItem} />
        ))}
      </div>
    )}
  </motion.div>
);

const InventoryCard: React.FC<{ area: string; item: InventoryItem; status: string; color: 'rose' | 'amber'; triggerImage: (a: string, i: InventoryItem) => void; deleteItem: (a: string, i: InventoryItem) => void }> = ({ area, item, status, color, triggerImage, deleteItem }) => (
  <div className={`bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col gap-4 group hover:border-${color === 'rose' ? 'rose' : 'amber'}-500/40 transition-all shadow-xl`}>
    <div className="flex gap-4">
      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-800 shrink-0 shadow-lg">
        {item.Imagen ? <img src={item.Imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" /> : <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-800"><ImageIcon className="w-10 h-10" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white uppercase truncate tracking-tight">{item.Nombre}</p>
        <p className="text-[11px] text-blue-400 font-mono font-bold mt-1 tracking-tighter">{item.Código}</p>
        <div className="mt-2 flex gap-2">
           <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${color === 'rose' ? 'bg-rose-950 border border-rose-500/40 text-rose-300' : 'bg-amber-950 border border-amber-500/40 text-amber-300'}`}>{status}</span>
           {item.Caducidad && <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-800 font-bold">{item.Caducidad}</span>}
        </div>
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
      <div className="flex flex-col">
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Almacén</span>
        <span className="text-xs text-slate-300 font-black">{area.replace(/_/g, ' ')}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => triggerImage(area, item)} className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-90"><Camera className="w-4 h-4" /></button>
        <button onClick={() => deleteItem(area, item)} className="p-2.5 rounded-xl bg-rose-600/10 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all shadow-lg active:scale-90"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  </div>
);

// --- VISTA PANTALLA COMPLETA: CENTRO DE INTEGRACIÓN TERMUX ---
const TermuxView: React.FC<{
  isBackendConnected?: boolean;
  onCheckConnection?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isBackendConnected, onCheckConnection, showToast }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    showToast('Comando copiado al portapapeles', 'success');
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const oneLineInstallCommand = `pkg update -y && pkg install -y nodejs git && git clone https://github.com/armunnaty/smart-scanner-industrial-pro.git && cd smart-scanner-industrial-pro && npm install`;
  const runCommand = `cd ~/smart-scanner-industrial-pro && npm run dev`;

  return (
    <motion.div
      key="termux"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-16"
    >
      {/* Banner de Estado de Conexión */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
          isBackendConnected
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isBackendConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} shrink-0`}>
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-sm flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isBackendConnected ? 'Servidor Termux / Node.js Activo y Conectado' : 'Modo Standalone / Almacenamiento Local'}</span>
            </p>
            <p className="text-xs opacity-90 mt-1 leading-relaxed">
              {isBackendConnected
                ? 'Las operaciones se sincronizan automáticamente con inventario_data.json en tiempo real.'
                : 'La app opera al 100% en tu navegador con LocalStorage. Inicia el servidor en Termux para sincronización multi-dispositivo en red local.'}
            </p>
          </div>
        </div>
        {onCheckConnection && (
          <button
            onClick={onCheckConnection}
            className="px-4 py-2.5 bg-black/50 hover:bg-black/70 rounded-xl text-xs font-bold border border-white/20 transition-all shrink-0 self-start sm:self-auto shadow-md active:scale-95 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Verificar Conexión</span>
          </button>
        )}
      </div>

      {/* Tarjetas de Pasos de Instalación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Paso 1: Instalación */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
              Instalación Rápida
            </span>
            <button
              onClick={() => copyToClipboard(oneLineInstallCommand, 'install')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Copiar comando"
            >
              {copiedCmd === 'install' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCmd === 'install' ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">Pega este comando en la terminal de Termux para clonar e instalar dependencias:</p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 break-all select-all">
            {oneLineInstallCommand}
          </div>
        </div>

        {/* Paso 2: Ejecución */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">2</span>
              Iniciar Servidor
            </span>
            <button
              onClick={() => copyToClipboard(runCommand, 'run')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Copiar comando"
            >
              {copiedCmd === 'run' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCmd === 'run' ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">Inicia el servidor backend en el puerto 3000 de tu teléfono:</p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 select-all">
            {runCommand}
          </div>
          <p className="text-[11px] text-slate-400">
            Abre Google Chrome en tu Android e ingresa a: <strong className="text-white">http://localhost:3000</strong>
          </p>
        </div>
      </div>

      {/* Consejos de Permisos de Cámara y Red */}
      <div className="p-5 bg-blue-950/30 border border-blue-500/30 rounded-2xl flex items-start gap-4 shadow-lg">
        <Camera className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
        <div className="flex flex-col gap-1.5 text-xs text-slate-300">
          <p className="font-bold text-blue-300 text-sm">Cámara y Escáner en Red Local (Android / Termux):</p>
          <p className="leading-relaxed">
            • <strong>En el mismo teléfono:</strong> Al ingresar a <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white">http://localhost:3000</code>, Chrome habilita la cámara de forma directa y nativa.<br />
            • <strong>Desde otros dispositivos en la misma red Wi-Fi:</strong> Ingresa a <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">chrome://flags</code> en Chrome, busca <em>"Insecure origins treated as secure"</em>, escribe la IP de tu teléfono con Termux (ej: <code className="text-white">http://192.168.1.100:3000</code>) y reinicia el navegador para desbloquear la cámara en red local.
          </p>
        </div>
      </div>

      {/* Estructura del Servidor */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
          <FolderTree className="w-4 h-4 text-blue-400" />
          Estructura de Persistencia en Servidor:
        </span>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre overflow-x-auto">
{`~/smart-scanner-industrial-pro/
├── server.ts              # Servidor Express Full-Stack y API de persistencia
├── inventario_data.json   # Base de datos física guardada automáticamente
├── src/                   # Código de escaneo de alta velocidad React PWA
└── dist/                  # Compilado estático para producción`}
        </div>
      </div>
    </motion.div>
  );
};

// --- VISTA PANTALLA COMPLETA: DIAGNÓSTICO Y SALUD DEL SISTEMA ---
const DiagnosticView: React.FC<{
  isBackendConnected?: boolean;
  isOnline?: boolean;
  pendingSyncCount?: number;
  activeArea?: string;
  activeItemsCount: number;
  totalGlobalItemsCount: number;
  totalAreasCount: number;
  onForceSync?: () => void;
  onLoadDemoData?: () => void;
  onManualSave?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({
  isBackendConnected,
  isOnline,
  pendingSyncCount = 0,
  activeArea = 'Inventario_General',
  activeItemsCount,
  totalGlobalItemsCount,
  totalAreasCount,
  onForceSync,
  onLoadDemoData,
  onManualSave,
  showToast,
}) => {
  return (
    <motion.div
      key="diagnostico"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-16"
    >
      {/* Resumen de Métricas de Salud */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-1 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Red</span>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                <Wifi className="w-4 h-4" /> En Línea
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                <WifiOff className="w-4 h-4" /> Sin Conexión
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-1 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Servidor Backend</span>
          <div className="flex items-center gap-2 mt-1">
            {isBackendConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> HTTP 200 Activo
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                <AlertCircle className="w-4 h-4" /> LocalStorage
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-1 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes de Envío</span>
          <p className="text-base font-black text-white font-mono mt-1">
            {pendingSyncCount} <span className="text-xs text-slate-400 font-sans font-normal">registros</span>
          </p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-1 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Áreas Registradas</span>
          <p className="text-base font-black text-blue-400 font-mono mt-1">
            {totalAreasCount} <span className="text-xs text-slate-400 font-sans font-normal">almacenes</span>
          </p>
        </div>
      </div>

      {/* Detalles del Sistema */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
        <h4 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Información de Memoria y Almacén Activo</span>
        </h4>

        <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-950/70 overflow-hidden text-xs">
          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-400">Área seleccionada actualmente:</span>
            <strong className="text-blue-300 font-bold">{activeArea.replace(/_/g, ' ')}</strong>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-400">Artículos en esta área:</span>
            <strong className="text-white font-mono">{activeItemsCount} productos</strong>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-400">Total en Almacén Global Consolidado:</span>
            <strong className="text-emerald-400 font-mono">{totalGlobalItemsCount} productos</strong>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-400">Motor de Base de Datos:</span>
            <span className="text-slate-300 font-mono font-bold">LocalStorage + JSON Sync</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción de Salud y Respaldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {onForceSync && (
          <button
            onClick={() => {
              onForceSync();
              showToast('Sincronización global iniciada', 'info');
            }}
            className="p-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-wider"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Sincronizar y Consolidar Todo</span>
          </button>
        )}

        {onManualSave && (
          <button
            onClick={() => {
              onManualSave();
            }}
            className="p-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-wider"
          >
            <Save className="w-5 h-5" />
            <span>Guardar Datos en Local y Servidor</span>
          </button>
        )}

        <a
          href="/api/descargar_bd"
          download="inventario_respaldo.json"
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-2xl transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-wider text-center active:scale-[0.98] shadow-md"
        >
          <Database className="w-5 h-5 text-emerald-400" />
          <span>Descargar Respaldo JSON Completo</span>
        </a>

        {onLoadDemoData && (
          <button
            onClick={() => {
              onLoadDemoData();
              showToast('Datos de demostración cargados', 'success');
            }}
            className="p-4 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-bold rounded-2xl transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-wider active:scale-[0.98] shadow-md"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Cargar Catálogo Demo de Prueba</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};


export const RightSidebarDrawer: React.FC<RightSidebarDrawerProps> = ({
  isOpen,
  onClose,
  allAreaItems,
  onUpdateItem,
  onDeleteAreaItem,
  onApproveMerma,
  showToast,
  isBackendConnected = false,
  isOnline = true,
  pendingSyncCount = 0,
  activeArea = 'Inventario_General',
  onOpenImport,
  onOpenAreas,
  onForceSync,
  onLoadDemoData,
  onManualSave,
  onCheckBackendConnection,
  initialView = 'menu',
}) => {
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [drawerSize, setDrawerSize] = useState<'normal' | 'wide' | 'full'>('normal');
  const [searchTerm, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('month');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedItemForImage, setSelectedItemForImage] = useState<{ area: string; item: InventoryItem } | null>(null);

  // --- PERSISTENCIA DE MERMA ---
  const [mermaRecords, setMermaRecords] = useState<MermaRecord[]>(() => {
    try {
      const saved = localStorage.getItem('inventario_merma_records');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('inventario_merma_records', JSON.stringify(mermaRecords));
  }, [mermaRecords]);

  const handleSaveMerma = (record: MermaRecord) => {
    setMermaRecords(prev => [record, ...prev]);
  };

  const handleUpdateMermaStatus = (id: string, nextStatus: MermaStatus) => {
    setMermaRecords(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const record = { ...next[idx], status: nextStatus };
      next[idx] = record;

      // SI SE APRUEBA DEFINITIVAMENTE: Ejecutar deducción inteligente de stock y reseteo a 0
      if (nextStatus === 'aprobado') {
        if (onApproveMerma) {
          onApproveMerma(record);
        } else {
          const targetArea = record.area;
          const targetSku = record.sku;
          const qtyToSubtract = record.cantidad;

          if (targetArea) {
             const areaItems = allAreaItems[targetArea] || [];
             const itemIdx = areaItems.findIndex(i => i.Código === targetSku);
             
             if (itemIdx !== -1) {
                const item = areaItems[itemIdx];
                const newTotal = (item.Total || 0) - qtyToSubtract;
                
                if (newTotal <= 0) {
                   onDeleteAreaItem(targetArea, item);
                } else {
                   const updatedItem = {
                      ...item,
                      Total: newTotal,
                      Bultos: Math.max(0, Math.floor(newTotal / (item.Piezas || 1))),
                      Fecha_Captura: new Date().toLocaleString('es-MX') + ' (MERMA)'
                   };
                   onUpdateItem(targetArea, updatedItem);
                }
             }
          }
        }
      }
      return next;
    });
  };

  const handleDeleteMermaRecord = (id: string) => {
    setMermaRecords(prev => prev.filter(r => r.id !== id));
  };

  // Sync initial view when opening
  React.useEffect(() => {
    if (isOpen) {
      setCurrentView(initialView || 'menu');
    }
  }, [isOpen, initialView]);

  // Flatten all items for general search and management
  const flatItems = useMemo(() => {
    const all: { area: string; item: InventoryItem }[] = [];
    Object.entries(allAreaItems).forEach(([area, items]) => {
      items.forEach((item) => {
        all.push({ area, item });
      });
    });
    return all;
  }, [allAreaItems]);

  // Filtering for Merma/Caducados
  const alertsItems = useMemo(() => {
    return flatItems.filter(({ item }) => {
      const health = calculateStockHealth(item.Total || 0, item.Precio || 0, item.Caducidad);
      return health.status === 'critical' || (health.daysToExpiration !== undefined && health.daysToExpiration <= 7);
    });
  }, [flatItems]);

  // Buscador Pro items
  const searchedItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return flatItems.slice(0, 50);
    return flatItems.filter(({ item }) => 
      item.Nombre.toLowerCase().includes(q) || 
      item.Código.toLowerCase().includes(q)
    );
  }, [flatItems, searchTerm]);

  // Historial logic with time-based filtering
  const historyData = useMemo(() => {
    const now = new Date();
    const filtered = flatItems.filter(({ item }) => {
      if (historyFilter === 'all') return true;
      
      const [datePart] = item.Fecha_Captura.split(' ');
      const [day, month] = datePart.split('/');
      if (!day || !month) return true;

      const itemDate = new Date();
      itemDate.setMonth(parseInt(month) - 1);
      itemDate.setDate(parseInt(day));
      itemDate.setHours(0, 0, 0, 0);

      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (historyFilter === 'day') return diffDays < 1;
      if (historyFilter === 'week') return diffDays < 7;
      if (historyFilter === 'month') return diffDays < 30;
      if (historyFilter === 'year') return diffDays < 365;
      return true;
    });

    return filtered.sort((a, b) => b.item.Fecha_Captura.localeCompare(a.item.Fecha_Captura));
  }, [flatItems, historyFilter]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItemForImage) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const updatedItem = { ...selectedItemForImage.item, Imagen: base64 };
      onUpdateItem(selectedItemForImage.area, updatedItem);
      setSelectedItemForImage(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerImageCapture = (area: string, item: InventoryItem) => {
    setSelectedItemForImage({ area, item });
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  // Opciones de Operación y Negocio
  const operationOptions = [
    { id: 'merma', label: 'Gestión de Merma', sub: 'Existencia cero, daños y reportes', icon: Trash2, color: 'text-rose-400', bg: 'bg-rose-500/20' },
    { id: 'caducados', label: 'Control de Caducidad', sub: 'Productos por vencer y alertas', icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { id: 'historial', label: 'Historial Mensual', sub: 'Auditoría de movimientos', icon: History, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { id: 'buscador', label: 'Buscador de Inventario', sub: 'Búsqueda global y evidencias visuales', icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  ];

  // Opciones de Sistema y Conectividad (Integradas desde la pantalla principal)
  const systemOptions = [
    { id: 'termux', label: 'Consola y Servidor Termux', sub: 'Guía de instalación, estado y red', icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-500/20', isRoute: true },
    { id: 'diagnostico', label: 'Diagnóstico del Sistema', sub: 'Salud de memoria, sync y ping', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/20', isRoute: true },
    { id: 'areas', label: 'Gestor de Áreas y Bodegas', sub: 'Crear y administrar almacenes', icon: FolderOpen, color: 'text-slate-300', bg: 'bg-slate-800/80', isAction: true, onClick: () => { onClose(); onOpenAreas?.(); } },
    { id: 'importar', label: 'Importar Inventario Excel / CSV', sub: 'Carga masiva de catálogos', icon: FileSpreadsheet, color: 'text-cyan-300', bg: 'bg-cyan-900/40', isAction: true, onClick: () => { onClose(); onOpenImport?.(); } },
    { id: 'guardar', label: 'Guardar y Respaldar Datos', sub: 'Guardado manual inmediato', icon: Save, color: 'text-emerald-300', bg: 'bg-emerald-900/40', isAction: true, onClick: () => { onManualSave?.(); } },
    { id: 'manual', label: 'Manual & Guía de Usuario', sub: 'Manual bilingüe y guía de funciones (ES/EN)', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/20', isRoute: true },
    { id: 'updates', label: 'Centro de Actualizaciones', sub: 'Verificar y cargar parches de software', icon: RefreshCw, color: 'text-purple-300', bg: 'bg-purple-950/40 border border-purple-500/40', isRoute: true },
    { id: 'configuracion', label: 'Configuración Pro', sub: 'Parámetros del motor y actualización', icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/20', isRoute: true },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            drag={currentView === 'menu' ? "x" : false}
            dragConstraints={{ left: 0, right: 420 }}
            dragElastic={{ left: 0.02, right: 0.08 }}
            onDragEnd={(_e, info) => {
              if (currentView === 'menu' && (info.offset.x > 70 || info.velocity.x > 180)) {
                onClose();
              }
            }}
            initial={{ x: '100%' }}
            animate={{ 
              x: 0,
              width: currentView === 'menu' 
                ? (drawerSize === 'normal' ? '100%' : drawerSize === 'wide' ? '100%' : '100vw') 
                : '100vw',
              maxWidth: currentView === 'menu' 
                ? (drawerSize === 'normal' ? '480px' : drawerSize === 'wide' ? '820px' : '100vw') 
                : '100vw'
            }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
            className={`fixed top-0 bottom-0 right-0 z-50 bg-slate-950 ${currentView === 'menu' ? 'border-l border-blue-500/40 shadow-2xl' : ''} flex flex-col text-slate-100 overflow-hidden select-none transition-all duration-300`}
          >
            {/* Dynamic Header with Fluid Resize Toggle */}
            <div className={`p-4 ${currentView === 'menu' ? 'bg-slate-900' : 'bg-slate-950 border-b-2 border-blue-600/50'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                {currentView !== 'menu' ? (
                  <button 
                    onClick={() => setCurrentView('menu')}
                    className="p-3 bg-slate-900 rounded-2xl hover:bg-slate-800 text-blue-400 border border-slate-800 flex items-center gap-2 font-bold text-xs shadow-lg transition-all active:scale-95"
                  >
                    <ChevronDown className="w-5 h-5 rotate-90" />
                    <span className="hidden xs:inline">VOLVER A GESTIÓN</span>
                  </button>
                ) : null}
                <div className={`p-2.5 rounded-xl border transition-colors ${currentView === 'menu' ? 'bg-amber-500/25 border-amber-500/50 text-amber-400' : 'bg-blue-600/30 border-blue-500/60 text-blue-400 shadow-blue-900/20 shadow-lg'}`}>
                  {currentView === 'menu' && <Settings className="w-6 h-6" />}
                  {currentView === 'merma' && <Trash2 className="w-6 h-6" />}
                  {currentView === 'caducados' && <Calendar className="w-6 h-6" />}
                  {currentView === 'historial' && <History className="w-6 h-6" />}
                  {currentView === 'buscador' && <Search className="w-6 h-6" />}
                  {currentView === 'termux' && <Terminal className="w-6 h-6" />}
                  {currentView === 'diagnostico' && <Activity className="w-6 h-6" />}
                  {currentView === 'configuracion' && <Settings className="w-6 h-6" />}
                  {currentView === 'manual' && <BookOpen className="w-6 h-6 text-purple-400" />}
                  {currentView === 'updates' && <RefreshCw className="w-6 h-6 text-purple-300 animate-spin-slow" />}
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                    <span>
                      {currentView === 'menu' && 'CENTRO DE GESTIÓN Y AJUSTES'}
                      {currentView === 'merma' && 'MÓDULO DE MERMA'}
                      {currentView === 'caducados' && 'CONTROL DE CADUCIDAD (20 DÍAS)'}
                      {currentView === 'historial' && 'HISTORIAL MENSUAL'}
                      {currentView === 'buscador' && 'BUSCADOR PRO'}
                      {currentView === 'termux' && 'SERVIDOR Y GUÍA TERMUX'}
                      {currentView === 'diagnostico' && 'DIAGNÓSTICO DEL SISTEMA'}
                      {currentView === 'configuracion' && 'AJUSTES Y PARÁMETROS'}
                      {currentView === 'manual' && 'MANUAL DE USUARIO (ES / EN)'}
                      {currentView === 'updates' && 'CENTRO DE ACTUALIZACIONES'}
                    </span>
                    <span className="text-[9px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded shadow-sm">
                      PRO
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentView === 'menu' && 'Administración completa de almacén y sistema'}
                    {currentView === 'merma' && 'Control de productos agotados, daños y reseteo a cero'}
                    {currentView === 'caducados' && 'Monitoreo preventivo con 20 días de anticipación'}
                    {currentView === 'historial' && 'Revisión de movimientos históricos'}
                    {currentView === 'buscador' && 'Búsqueda global y evidencias visuales'}
                    {currentView === 'termux' && 'Integración con Android y sincronización local'}
                    {currentView === 'diagnostico' && 'Métricas de memoria, red y base de datos'}
                    {currentView === 'configuracion' && 'Parámetros del motor, manual y actualizaciones'}
                    {currentView === 'manual' && 'Documentación oficial bilingüe y guía detallada'}
                    {currentView === 'updates' && 'Comprobar e instalar parches de software'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Resizable width toggle */}
                {currentView === 'menu' && (
                  <div className="hidden sm:flex bg-slate-950 rounded-xl p-1 border border-slate-800 text-[10px] font-bold">
                    <button
                      onClick={() => setDrawerSize('normal')}
                      className={`px-2 py-1 rounded-lg transition-colors ${drawerSize === 'normal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Ancho normal"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setDrawerSize('wide')}
                      className={`px-2 py-1 rounded-lg transition-colors ${drawerSize === 'wide' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Ancho extendido"
                    >
                      Amplio
                    </button>
                    <button
                      onClick={() => setDrawerSize('full')}
                      className={`px-2 py-1 rounded-lg transition-colors ${drawerSize === 'full' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Pantalla completa"
                    >
                      Completo
                    </button>
                  </div>
                )}
                <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area with Transitions */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <AnimatePresence mode="wait">
                {currentView === 'menu' && (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Sección 1: Operaciones de Almacén */}
                    <div>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2 mb-2 block">
                        📋 Operaciones de Almacén
                      </span>
                      <div className="flex flex-col gap-2">
                        {operationOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setCurrentView(opt.id as ViewType)}
                            className="group flex items-center gap-4 p-3.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition-all active:scale-[0.98]"
                          >
                            <div className={`p-3 rounded-xl ${opt.bg} ${opt.color} group-hover:scale-110 transition-transform`}>
                              <opt.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-bold text-slate-100 text-sm truncate">{opt.label}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">{opt.sub}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sección 2: Sistema y Conectividad (Opciones integradas de la barra) */}
                    <div>
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest px-2 mb-2 block">
                        🛠️ Sistema y Herramientas
                      </span>
                      <div className="flex flex-col gap-2">
                        {systemOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              if (opt.isRoute) {
                                setCurrentView(opt.id as ViewType);
                              } else if (opt.onClick) {
                                opt.onClick();
                              }
                            }}
                            className="group flex items-center gap-4 p-3.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all active:scale-[0.98]"
                          >
                            <div className={`p-3 rounded-xl ${opt.bg} ${opt.color} group-hover:scale-110 transition-transform`}>
                              <opt.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-bold text-slate-100 text-sm truncate">{opt.label}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">{opt.sub}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-amber-500 transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-5 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status de Inventario</p>
                       <p className="text-xl font-black text-emerald-400 font-mono">{flatItems.length} REGISTROS</p>
                       <div className="flex justify-center gap-4 mt-3">
                          <div className="flex flex-col items-center">
                             <span className="text-[9px] text-slate-500">Áreas</span>
                             <span className="text-xs font-bold text-white">{Object.keys(allAreaItems).length}</span>
                          </div>
                          <div className="w-px h-7 bg-slate-800" />
                          <div className="flex flex-col items-center">
                             <span className="text-[9px] text-slate-500">Alertas</span>
                             <span className="text-xs font-bold text-rose-400">{alertsItems.length}</span>
                          </div>
                          <div className="w-px h-7 bg-slate-800" />
                          <div className="flex flex-col items-center">
                             <span className="text-[9px] text-slate-500">Servidor</span>
                             <span className={`text-xs font-bold ${isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                               {isBackendConnected ? 'Online' : 'Local'}
                             </span>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}

                {currentView === 'merma' && (
                  <MermaView 
                    items={flatItems} 
                    mermaRecords={mermaRecords}
                    onSaveMerma={handleSaveMerma}
                    onUpdateStatus={handleUpdateMermaStatus}
                    onDeleteMerma={handleDeleteMermaRecord}
                    showToast={showToast}
                  />
                )}

                {currentView === 'caducados' && (
                  <CaducadosView 
                    items={flatItems.filter(({ item }) => {
                       if (!item.Caducidad) return false;
                       const health = calculateStockHealth(item.Total || 0, item.Precio || 0, item.Caducidad);
                       return health.daysToExpiration !== undefined && health.daysToExpiration <= 20;
                    })} 
                    triggerImage={triggerImageCapture} 
                    deleteItem={onDeleteAreaItem} 
                  />
                )}

                {currentView === 'historial' && (
                  <motion.div
                    key="historial"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Movimientos Recientes
                      </h4>
                      <select 
                        value={historyFilter} 
                        onChange={(e) => setHistoryFilter(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 text-[10px] rounded-lg px-2 py-1 outline-none text-slate-300 font-bold uppercase tracking-tighter"
                      >
                        <option value="day">Hoy</option>
                        <option value="week">Semana</option>
                        <option value="month">Mes</option>
                        <option value="year">Año</option>
                        <option value="all">Todo</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      {historyData.length === 0 ? (
                        <div className="py-12 text-center text-slate-600">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">Sin registros para este periodo</p>
                        </div>
                      ) : historyData.slice(0, 50).map(({ area, item }, i) => {
                        const isSalida = item.Fecha_Captura.includes('(-)');
                        return (
                          <div key={i} className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex items-center justify-between hover:bg-slate-900 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-lg ${!isSalida ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {!isSalida ? <Zap className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate uppercase">{item.Nombre}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{item.Fecha_Captura} • {area.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-black font-mono ${!isSalida ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {!isSalida ? `+${item.Total}` : `-${item.Total}`}
                              </p>
                              <p className="text-[9px] text-slate-600 font-mono uppercase">{!isSalida ? 'IN' : 'OUT'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {currentView === 'buscador' && (
                  <motion.div
                    key="buscador"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {searchedItems.map(({ area, item }, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-cyan-500/50 transition-all group flex flex-col shadow-lg">
                          <div className="h-48 relative bg-slate-950 flex items-center justify-center shrink-0 border-b border-slate-800">
                            {item.Imagen ? (
                              <img src={item.Imagen} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                                <ImageIcon className="w-12 h-12" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</span>
                              </div>
                            )}
                            <button 
                              onClick={() => triggerImageCapture(area, item)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]"
                            >
                              <div className="bg-white text-black p-3 rounded-2xl flex items-center gap-2 font-black text-xs shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                <Camera className="w-5 h-5" />
                                <span>CAPTURAR FOTO</span>
                              </div>
                            </button>
                          </div>
                          <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-black text-white uppercase truncate flex-1">{item.Nombre}</p>
                                <span className="text-xs font-mono text-emerald-400 font-black bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                  ${(item.Precio || 0).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-tight">{item.Código}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto border-t border-slate-800/50 pt-3">
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg font-bold uppercase tracking-tighter">{area.replace(/_/g, ' ')}</span>
                              <div className="text-right">
                                <p className="text-sm font-black text-cyan-400 font-mono leading-none">{item.Total}</p>
                                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-0.5">Stock</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {currentView === 'termux' && (
                  <TermuxView
                    isBackendConnected={isBackendConnected}
                    onCheckConnection={onCheckBackendConnection}
                    showToast={showToast}
                  />
                )}

                {currentView === 'diagnostico' && (
                  <DiagnosticView
                    isBackendConnected={isBackendConnected}
                    isOnline={isOnline}
                    pendingSyncCount={pendingSyncCount}
                    activeArea={activeArea}
                    activeItemsCount={flatItems.length}
                    totalGlobalItemsCount={flatItems.length}
                    totalAreasCount={Object.keys(allAreaItems).length}
                    onForceSync={onForceSync}
                    onLoadDemoData={onLoadDemoData}
                    onManualSave={onManualSave}
                    showToast={showToast}
                  />
                )}

                {currentView === 'configuracion' && (
                  <motion.div
                    key="configuracion"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-5"
                  >
                    {/* Action Cards to open Manual & Updates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentView('manual')}
                        className="p-4 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-2xl flex items-center gap-3 text-left transition-all shadow-md active:scale-95 group"
                      >
                        <div className="p-3 bg-purple-600 rounded-xl text-white shadow-md shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">
                            Manual de Usuario (ES/EN)
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Guía bilingüe de funciones, reglas y capacidades
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentView('updates')}
                        className="p-4 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-2xl flex items-center gap-3 text-left transition-all shadow-md active:scale-95 group"
                      >
                        <div className="p-3 bg-purple-600 rounded-xl text-white shadow-md shrink-0">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">
                            Centro de Actualizaciones
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Comprobar parches y cargar actualizaciones
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">Respuesta Háptica</p>
                          <p className="text-[10px] text-slate-500">Vibración al escanear con éxito</p>
                        </div>
                        <div className="w-10 h-6 bg-emerald-600 rounded-full p-1 flex justify-end cursor-pointer shadow-inner">
                           <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                        <div>
                          <p className="text-sm font-bold text-white">Sonido del Sistema</p>
                          <p className="text-[10px] text-slate-500">Alertas auditivas en procesos</p>
                        </div>
                        <div className="w-10 h-6 bg-emerald-600 rounded-full p-1 flex justify-end cursor-pointer shadow-inner">
                           <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                        <div>
                          <p className="text-sm font-bold text-white">Sincronización Cloud</p>
                          <p className="text-[10px] text-slate-500">Guardado en tiempo real con Termux</p>
                        </div>
                        <div className="w-10 h-6 bg-emerald-600 rounded-full p-1 flex justify-end cursor-pointer shadow-inner">
                           <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                       <p className="text-xs font-black text-rose-400 mb-2 uppercase tracking-widest">Zona de Mantenimiento</p>
                       <button
                         onClick={() => showToast('Caché de imágenes verificado y optimizado.', 'info')}
                         className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"
                       >
                          <Trash2 className="w-4 h-4" />
                          Limpiar Caché de Imágenes Local
                       </button>
                    </div>
                  </motion.div>
                )}

                {currentView === 'manual' && (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <UserManual
                      onClose={onClose}
                      onOpenUpdateCenter={() => setCurrentView('updates')}
                    />
                  </motion.div>
                )}

                {currentView === 'updates' && (
                  <motion.div
                    key="updates"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <SoftwareUpdateCenter
                      showToast={showToast}
                      onUpdateApplied={() => showToast('Actualización de software procesada con éxito.', 'success')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer with version and breadcrumb */}
            <div className={`p-4 ${currentView === 'menu' ? 'bg-slate-900' : 'bg-slate-950 border-t-2 border-slate-800'} border-t border-slate-800`}>
               <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold">
                  <div className="flex flex-col">
                    <span>SYSTEM VERSION 4.2 PRO</span>
                    <span className="text-[8px] opacity-50 uppercase tracking-tighter">Powered by Industrial Engine</span>
                  </div>
                  <div className="flex gap-3">
                    {currentView !== 'menu' && (
                       <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 transition-all active:scale-95 text-xs font-black uppercase tracking-wider"
                       >
                         <span>Ir a Operación</span>
                         <ChevronRight className="w-4 h-4" />
                       </button>
                    )}
                    {currentView === 'menu' && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <span className="animate-pulse">DESLIZA PARA CERRAR</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageUpload}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
