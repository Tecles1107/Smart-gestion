export type MermaStatus = 'espera' | 'validado' | 'aprobado';

export interface MermaRecord {
  id: string;
  fecha: string;
  sku: string;
  nombre: string;
  cantidad: number;
  motivo: string;
  responsable: string;
  evidencia?: string; // Base64
  status: MermaStatus;
  area?: string;
  caducidad?: string;
}

export interface InventoryItem {
  id?: string;
  Fecha_Captura: string;
  Área: string;
  Código: string;
  Nombre: string;
  Caducidad?: string;
  Bultos: number;
  Piezas: number; // piezas por bulto
  Total: number;  // total piezas
  Precio?: number;
  Imagen?: string; // Base64 image
  _extraData?: Record<string, any>;
}

export type ScanMode = 'entrada' | 'salida' | 'consulta';

export interface MovementRecord {
  id: string;
  timestamp: string; // ISO string or formatted timestamp
  date: string;      // YYYY-MM-DD
  type: 'entrada' | 'salida' | 'merma';
  sku: string;
  nombre: string;
  cantidadPiezas: number;
  cantidadBultos: number;
  valor: number;
  area: string;
  motivo?: string;
}

export interface HistoricalFlowPoint {
  date: string;
  fullDate: string;
  entradas: number;
  salidas: number;
  neto: number;
  entradasBultos?: number;
  salidasBultos?: number;
  entradasValor?: number;
  salidasValor?: number;
}

export interface AuditAreaDetail {
  area: string;
  bultos: number;
  piezasPorBulto: number;
  total: number;
  fecha: string;
  caducidad?: string;
}

export interface AuditResult {
  sku: string;
  nombre: string;
  piezasPorBulto: number;
  stockGlobalBultos: number;
  stockGlobalPiezas: number;
  stockAreaBultos: number;
  stockAreaPiezas: number;
  desglosePorArea: AuditAreaDetail[];
  itemEnEstaArea?: InventoryItem;
}

export interface ColumnMapping {
  codigo: string;
  nombre: string;
  bultos?: string;
  piezas?: string;
  precio?: string;
  caducidad?: string;
  conservarExtras?: boolean;
}
