import { InventoryItem, AuditResult, AuditAreaDetail, ColumnMapping } from '../types/inventory';

export type SortOption =
  | 'defecto'
  | 'fecha_desc'
  | 'fecha_asc'
  | 'nombre_asc'
  | 'nombre_desc'
  | 'piezas_desc'
  | 'piezas_asc';

export function sortInventoryItems(items: InventoryItem[], sortBy: SortOption): InventoryItem[] {
  if (sortBy === 'defecto' || !sortBy) {
    return items;
  }

  const copy = [...items];

  switch (sortBy) {
    case 'nombre_asc':
      return copy.sort((a, b) => (a.Nombre || '').localeCompare(b.Nombre || '', 'es', { sensitivity: 'base' }));
    case 'nombre_desc':
      return copy.sort((a, b) => (b.Nombre || '').localeCompare(a.Nombre || '', 'es', { sensitivity: 'base' }));
    case 'piezas_desc':
      return copy.sort((a, b) => (Number(b.Total) || 0) - (Number(a.Total) || 0));
    case 'piezas_asc':
      return copy.sort((a, b) => (Number(a.Total) || 0) - (Number(b.Total) || 0));
    case 'fecha_desc':
      return copy.sort((a, b) => (b.Fecha_Captura || '').localeCompare(a.Fecha_Captura || ''));
    case 'fecha_asc':
      return copy.sort((a, b) => (a.Fecha_Captura || '').localeCompare(b.Fecha_Captura || ''));
    default:
      return copy;
  }
}

export function cleanNum(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\D/g, '').trim();
}

export function formatDateTime(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

export function calculateTotal(bultos: number, piezasPorBulto: number): number {
  const b = Number(bultos) || 0;
  const p = Number(piezasPorBulto) || 0;
  if (b < 0 || p < 0) return 0;
  if (b === 0) return p;
  return b * p;
}

export function calculatePiecesPerBundle(item: Partial<InventoryItem>): number {
  const p = parseInt(String(item.Piezas || 0), 10);
  const b = parseInt(String(item.Bultos || 0), 10);
  const t = parseInt(String(item.Total || 0), 10);

  if (p > 0) return p;
  if (t > 0 && b > 0) {
    const calc = Math.round(t / b);
    if (calc > 0) return calc;
  }
  return t > 0 ? t : 1;
}

export function aggregateGlobalInventory(
  areaDataMap: Record<string, InventoryItem[]>
): InventoryItem[] {
  const mapG: Record<string, {
    Fecha_Captura: string;
    Código: string;
    Nombre: string;
    Caducidad: string;
    Bultos: number;
    Piezas: number;
    Total: number;
    Precio: number;
    areasMap: Record<string, { b: number; p: number; t: number }>;
    _extraData: Record<string, any>;
  }> = {};

  for (const [areaKey, items] of Object.entries(areaDataMap)) {
    if (areaKey === 'Inventario_General' || !Array.isArray(items)) continue;
    const areaName = areaKey.replace(/_/g, ' ');

    for (const it of items) {
      const sku = cleanNum(it.Código);
      if (!sku) continue;

      const b = parseInt(String(it.Bultos || 0), 10);
      const p = calculatePiecesPerBundle(it);
      const t = parseInt(String(it.Total || 0), 10);
      const pr = parseFloat(String(it.Precio || 0)) || 0;
      const cad = it.Caducidad || '';
      const key = cad ? `${sku}_${cad}` : sku;

      if (!mapG[key]) {
        mapG[key] = {
          Fecha_Captura: it.Fecha_Captura || formatDateTime(),
          Código: sku,
          Nombre: it.Nombre || 'S/N',
          Caducidad: cad,
          Bultos: 0,
          Piezas: p,
          Total: 0,
          Precio: pr,
          areasMap: {},
          _extraData: { ...(it._extraData || {}) },
        };
      }

      if (mapG[key].Nombre === 'S/N' && it.Nombre && it.Nombre !== 'S/N') {
        mapG[key].Nombre = it.Nombre;
      }
      if (pr > 0) {
        mapG[key].Precio = pr;
      }

      mapG[key].areasMap[areaName] = { b, p, t };
      mapG[key].Bultos += b;
      mapG[key].Total += t;
    }
  }

  return Object.values(mapG).map((entry) => {
    const areas = Object.keys(entry.areasMap);
    const desglose = areas.map((a) => {
      const info = entry.areasMap[a];
      return `${a}: ${info.b}b (${info.t}p)`;
    }).join(' | ');

    const extra: Record<string, any> = { ...entry._extraData };
    if (areas.length > 1) {
      extra.Desglose = desglose;
    }

    return {
      Fecha_Captura: entry.Fecha_Captura,
      Área: areas.join(', '),
      Código: entry.Código,
      Nombre: entry.Nombre,
      Caducidad: entry.Caducidad,
      Bultos: entry.Bultos,
      Piezas: entry.Piezas,
      Total: entry.Total,
      Precio: entry.Precio,
      _extraData: extra,
    };
  });
}

export function auditProduct(
  skuQuery: string,
  allAreas: Record<string, InventoryItem[]>,
  currentArea: string
): AuditResult | null {
  const cl = cleanNum(skuQuery);
  if (!cl) return null;

  let nom = 'S/N';
  let pz = 1;
  const desglose: AuditAreaDetail[] = [];
  let globalBultos = 0;
  let globalPiezas = 0;
  let itemEnEsta: InventoryItem | undefined;

  for (const [areaKey, items] of Object.entries(allAreas)) {
    if (!Array.isArray(items)) continue;
    const matches = items.filter((i) => cleanNum(i.Código) === cl);

    for (const match of matches) {
      if (nom === 'S/N' && match.Nombre && match.Nombre !== 'S/N') {
        nom = match.Nombre;
      }
      pz = calculatePiecesPerBundle(match);
      const b = parseInt(String(match.Bultos || 0), 10);
      const t = parseInt(String(match.Total || 0), 10);

      if (areaKey !== 'Inventario_General') {
        globalBultos += b;
        globalPiezas += t;
      }

      desglose.push({
        area: areaKey.replace(/_/g, ' '),
        bultos: b,
        piezasPorBulto: pz,
        total: t,
        fecha: match.Fecha_Captura || '',
        caducidad: match.Caducidad || '',
      });

      if (areaKey === currentArea) {
        itemEnEsta = match;
      }
    }
  }

  if (desglose.length === 0) return null;

  return {
    sku: cl,
    nombre: nom,
    piezasPorBulto: pz,
    stockGlobalBultos: globalBultos,
    stockGlobalPiezas: globalPiezas,
    stockAreaBultos: itemEnEsta ? parseInt(String(itemEnEsta.Bultos || 0), 10) : 0,
    stockAreaPiezas: itemEnEsta ? parseInt(String(itemEnEsta.Total || 0), 10) : 0,
    desglosePorArea: desglose,
    itemEnEstaArea: itemEnEsta,
  };
}

export function filterInventory(items: InventoryItem[], query: string): InventoryItem[] {
  if (!query || !query.trim()) return items;

  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const searchWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 0);

  return items.filter((item) => {
    const valuesString = [
      item.Código,
      item.Nombre,
      item.Área,
      item.Caducidad,
      item.Fecha_Captura,
      item.Total,
      item.Bultos,
      item.Precio,
      ...(item._extraData ? Object.values(item._extraData) : []),
    ]
      .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v || '')))
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return searchWords.every((word) => valuesString.includes(word));
  });
}

export function parseImportedRows(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  targetArea: string
): InventoryItem[] {
  const result: InventoryItem[] = [];

  for (const row of rows) {
    const rawCode = mapping.codigo ? row[mapping.codigo] : '';
    const sku = cleanNum(rawCode);
    if (!sku) continue;

    const nom = mapping.nombre ? String(row[mapping.nombre] || 'S/N').trim() : 'S/N';
    const b = mapping.bultos ? parseInt(String(row[mapping.bultos] || 0), 10) : 0;
    const rawPzOrTotal = mapping.piezas ? parseInt(String(row[mapping.piezas] || 0), 10) : 0;
    const precio = mapping.precio ? parseFloat(String(row[mapping.precio] || 0)) || 0 : 0;
    const caducidad = mapping.caducidad ? String(row[mapping.caducidad] || '') : '';

    let piezasPorBulto = 1;
    let totalPiezas = 0;

    if (b > 0 && rawPzOrTotal > 0) {
      // If rawPzOrTotal is larger than b and likely a total, or it is pieces/bulto
      if (rawPzOrTotal > b * 2) {
        totalPiezas = rawPzOrTotal;
        piezasPorBulto = Math.round(totalPiezas / b) || 1;
      } else {
        piezasPorBulto = rawPzOrTotal;
        totalPiezas = b * piezasPorBulto;
      }
    } else if (b === 0 && rawPzOrTotal > 0) {
      piezasPorBulto = rawPzOrTotal;
      totalPiezas = rawPzOrTotal;
    } else if (b > 0 && rawPzOrTotal === 0) {
      piezasPorBulto = 1;
      totalPiezas = b;
    }

    const extra: Record<string, any> = {};
    if (mapping.conservarExtras) {
      for (const [k, v] of Object.entries(row)) {
        if (!k.startsWith('__EMPTY') && ![mapping.codigo, mapping.nombre, mapping.bultos, mapping.piezas, mapping.precio, mapping.caducidad].includes(k)) {
          extra[k] = v;
        }
      }
    }

    result.push({
      Fecha_Captura: formatDateTime(),
      Área: targetArea.replace(/_/g, ' '),
      Código: sku,
      Nombre: nom,
      Caducidad: caducidad,
      Bultos: Math.max(0, b),
      Piezas: Math.max(1, piezasPorBulto),
      Total: Math.max(0, totalPiezas),
      Precio: Math.max(0, precio),
      _extraData: extra,
    });
  }

  return result;
}
