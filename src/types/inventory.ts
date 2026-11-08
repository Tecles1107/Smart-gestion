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
  _extraData?: Record<string, any>;
}

export type ScanMode = 'entrada' | 'salida' | 'consulta';

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
