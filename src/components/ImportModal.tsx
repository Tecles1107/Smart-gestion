import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Table,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ColumnMapping, InventoryItem } from '../types/inventory';
import { parseImportedRows } from '../utils/inventoryLogic';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (items: InventoryItem[], areaName: string, isNewArea: boolean) => void;
  activeArea: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  activeArea,
}) => {
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    codigo: '',
    nombre: '',
    bultos: '',
    piezas: '',
    precio: '',
    caducidad: '',
    conservarExtras: true,
  });
  const [importTarget, setImportTarget] = useState<'current' | 'new'>('new');
  const [newAreaName, setNewAreaName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
    setFileName(file.name);
    setNewAreaName(baseName);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let rows: any[] = [];
        if (ext === 'json') {
          rows = JSON.parse(event.target?.result as string);
        } else {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];

          // Smart row detection: search first 10 rows for headers
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
          let headerRowIndex = 0;

          for (let r = range.s.r; r <= Math.min(range.e.r, 10); ++r) {
            const rowTexts: string[] = [];
            for (let c = range.s.c; c <= range.e.c; ++c) {
              const cell = sheet[XLSX.utils.encode_cell({ r, c })];
              if (cell && cell.v) rowTexts.push(String(cell.v).toLowerCase());
            }
            const fullText = rowTexts.join(' ');
            if (
              fullText.includes('codigo') ||
              fullText.includes('sku') ||
              fullText.includes('upc') ||
              fullText.includes('nombre') ||
              fullText.includes('producto')
            ) {
              headerRowIndex = r;
              break;
            }
          }

          rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });
        }

        if (!Array.isArray(rows) || rows.length === 0) {
          setErrorMsg('El archivo no contiene filas legibles.');
          return;
        }

        const colSet = new Set<string>();
        rows.slice(0, 50).forEach((row) => {
          Object.keys(row).forEach((k) => {
            if (!k.startsWith('__EMPTY')) colSet.add(k);
          });
        });
        const cols = Array.from(colSet);

        setRawRows(rows);
        setAvailableColumns(cols);
        setErrorMsg(null);

        // Smart column mapper auto-detection
        const findCol = (keywords: string[]) =>
          cols.find((c) => keywords.some((k) => c.toLowerCase().includes(k))) || '';

        setMapping({
          codigo: findCol(['cod', 'sku', 'upc', 'barcode', 'art', 'clave', 'ref']),
          nombre: findCol(['nom', 'descrip', 'producto', 'articulo', 'detalle', 'item']),
          bultos: findCol(['bulto', 'caja', 'paq', 'bto', 'empaque']),
          piezas: findCol(['pieza', 'pza', 'total', 'cant', 'stock', 'existencia']),
          precio: findCol(['precio', 'costo', 'valor', 'unit']),
          caducidad: findCol(['cad', 'venc', 'fecha']),
          conservarExtras: true,
        });
      } catch (err: any) {
        setErrorMsg('Error al leer el archivo: ' + (err?.message || err));
      }
    };

    if (ext === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleConfirmImport = () => {
    if (!mapping.codigo) {
      setErrorMsg('Debes seleccionar al menos la columna del CÓDIGO / SKU.');
      return;
    }
    if (!mapping.nombre) {
      setErrorMsg('Debes seleccionar la columna del NOMBRE.');
      return;
    }

    const targetArea = importTarget === 'new' && newAreaName.trim()
      ? newAreaName.trim().replace(/\s+/g, '_')
      : activeArea;

    const parsedItems = parseImportedRows(rawRows, mapping, targetArea);
    if (parsedItems.length === 0) {
      setErrorMsg('No se pudieron extraer códigos válidos con el mapeo seleccionado.');
      return;
    }

    onImportComplete(parsedItems, targetArea, importTarget === 'new');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Asistente de Importación Flexible</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar asistente"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* File Picker Zone */}
          {rawRows.length === 0 ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-950/60 transition-colors flex flex-col items-center justify-center">
              <UploadCloud className="w-12 h-12 text-slate-500 mb-2" />
              <p className="text-sm font-bold text-white mb-1">
                Selecciona tu archivo de inventario
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-sm">
                Soporta archivos Excel (<strong>.xlsx</strong>, <strong>.xls</strong>), CSV (<strong>.csv</strong>) o JSON exportado.
              </p>
              <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95">
                <span>Examinar Archivo</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <>
              {/* File details alert */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Archivo:</span>{' '}
                  <strong className="text-emerald-400">{fileName}</strong>
                  <span className="text-slate-500 ml-2">({rawRows.length} filas detectadas)</span>
                </div>
                <label className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline text-[11px]">
                  Cambiar archivo
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {/* Column Selectors Grid */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Asignación de Columnas del Archivo:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Codigo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-blue-400">
                      CÓDIGO / SKU / UPC (*)
                    </label>
                    <select
                      value={mapping.codigo}
                      onChange={(e) => setMapping({ ...mapping, codigo: e.target.value })}
                      className="bg-slate-950 border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nombre */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-blue-400">
                      DESCRIPCIÓN / NOMBRE (*)
                    </label>
                    <select
                      value={mapping.nombre}
                      onChange={(e) => setMapping({ ...mapping, nombre: e.target.value })}
                      className="bg-slate-950 border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bultos */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">
                      BULTOS / CAJAS (Opcional)
                    </label>
                    <select
                      value={mapping.bultos}
                      onChange={(e) => setMapping({ ...mapping, bultos: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Ninguna --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Piezas / Total */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">
                      PIEZAS O TOTAL (Opcional)
                    </label>
                    <select
                      value={mapping.piezas}
                      onChange={(e) => setMapping({ ...mapping, piezas: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Ninguna --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Precio */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">
                      PRECIO ($) (Opcional)
                    </label>
                    <select
                      value={mapping.precio}
                      onChange={(e) => setMapping({ ...mapping, precio: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Ninguna --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Caducidad */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">
                      CADUCIDAD / FECHA (Opcional)
                    </label>
                    <select
                      value={mapping.caducidad}
                      onChange={(e) => setMapping({ ...mapping, caducidad: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Ninguna --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    id="chkExtras"
                    checked={mapping.conservarExtras}
                    onChange={(e) => setMapping({ ...mapping, conservarExtras: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-800 border-slate-700"
                  />
                  <label htmlFor="chkExtras" className="cursor-pointer select-none">
                    Conservar columnas adicionales (Detalles, notas, pasillo, etc.)
                  </label>
                </div>
              </div>

              {/* Destination Area selector */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Destino de la Importación:
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'new'}
                      onChange={() => setImportTarget('new')}
                      className="text-emerald-500"
                    />
                    <span>Crear nueva área</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'current'}
                      onChange={() => setImportTarget('current')}
                      className="text-emerald-500"
                    />
                    <span>Agregar a "{activeArea.replace(/_/g, ' ')}"</span>
                  </label>
                </div>

                {importTarget === 'new' && (
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Nombre del nueva área..."
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                )}
              </div>

              {/* Preview table */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Vista Previa (Primeras 3 filas):
                </label>
                <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950 text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-1.5">Código ({mapping.codigo || '?'})</th>
                        <th className="p-1.5">Nombre ({mapping.nombre || '?'})</th>
                        <th className="p-1.5">Bultos</th>
                        <th className="p-1.5">Pzs/Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {rawRows.slice(0, 3).map((r, i) => (
                        <tr key={i}>
                          <td className="p-1.5 font-mono text-blue-400">{r[mapping.codigo] || '-'}</td>
                          <td className="p-1.5 truncate max-w-[140px]">{r[mapping.nombre] || '-'}</td>
                          <td className="p-1.5">{mapping.bultos ? r[mapping.bultos] || 0 : 0}</td>
                          <td className="p-1.5">{mapping.piezas ? r[mapping.piezas] || 0 : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Importar</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
