import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanNum,
  cleanCode,
  parsePrice,
  parseExpirationDate,
  calculateTotal,
  calculatePiecesPerBundle,
  aggregateGlobalInventory,
  auditProduct,
  filterInventory,
  parseImportedRows,
  sortInventoryItems,
  validateBarcodeFormat,
  calculateStockHealth,
  applyMermaApprovalDeduction,
  syncExpiringProductsArea,
  syncItemAcrossAllAreas,
  computeHistoricalFlow,
} from './inventoryLogic';
import { InventoryItem } from '../types/inventory';

test('sortInventoryItems sorts by name, pieces, and keeps default order', () => {
  const items: InventoryItem[] = [
    { Fecha_Captura: '29/10 10:00', Área: 'Hogar', Código: '1', Nombre: 'Zote', Bultos: 1, Piezas: 10, Total: 10 },
    { Fecha_Captura: '29/10 11:00', Área: 'Hogar', Código: '2', Nombre: 'Ariel', Bultos: 2, Piezas: 25, Total: 50 },
    { Fecha_Captura: '29/10 12:00', Área: 'Hogar', Código: '3', Nombre: 'Cloralex', Bultos: 1, Piezas: 5, Total: 5 },
  ];

  // Default order preserved
  assert.equal(sortInventoryItems(items, 'defecto')[0].Nombre, 'Zote');

  // Name A-Z
  const byName = sortInventoryItems(items, 'nombre_asc');
  assert.equal(byName[0].Nombre, 'Ariel');
  assert.equal(byName[1].Nombre, 'Cloralex');
  assert.equal(byName[2].Nombre, 'Zote');

  // Name Z-A
  const byNameDesc = sortInventoryItems(items, 'nombre_desc');
  assert.equal(byNameDesc[0].Nombre, 'Zote');

  // Total pieces desc
  const byPzs = sortInventoryItems(items, 'piezas_desc');
  assert.equal(byPzs[0].Total, 50);
  assert.equal(byPzs[2].Total, 5);
});

test('cleanNum strips non-numeric characters correctly', () => {
  assert.equal(cleanNum('  7501000123456  '), '7501000123456');
  assert.equal(cleanNum('SKU-9988-ABC'), '9988');
  assert.equal(cleanNum(null), '');
  assert.equal(cleanNum(undefined), '');
  assert.equal(cleanNum(12345), '12345');
});

test('calculateTotal computes packages and pieces multiplication or single piece correctly', () => {
  assert.equal(calculateTotal(0, 5), 5); // solo piezas
  assert.equal(calculateTotal(3, 12), 36);
  assert.equal(calculateTotal(10, 0), 0);
  assert.equal(calculateTotal(-2, 5), 0);
});

test('calculatePiecesPerBundle extracts ratio or fallback correctly', () => {
  assert.equal(calculatePiecesPerBundle({ Piezas: 24, Bultos: 2, Total: 48 }), 24);
  assert.equal(calculatePiecesPerBundle({ Piezas: 0, Bultos: 2, Total: 50 }), 25);
  assert.equal(calculatePiecesPerBundle({ Piezas: 0, Bultos: 0, Total: 10 }), 10);
  assert.equal(calculatePiecesPerBundle({ Piezas: 0, Bultos: 0, Total: 0 }), 1);
});

test('aggregateGlobalInventory correctly combines across multiple areas', () => {
  const area1Items: InventoryItem[] = [
    {
      Fecha_Captura: '29/10 14:00',
      Área: 'Hogar',
      Código: '75012345',
      Nombre: 'Detergente Líquido',
      Bultos: 5,
      Piezas: 4,
      Total: 20,
      Precio: 85.5,
    },
  ];

  const area2Items: InventoryItem[] = [
    {
      Fecha_Captura: '29/10 14:30',
      Área: 'Fiesta',
      Código: '75012345',
      Nombre: 'Detergente Líquido',
      Bultos: 2,
      Piezas: 4,
      Total: 8,
      Precio: 85.5,
    },
    {
      Fecha_Captura: '29/10 14:35',
      Área: 'Fiesta',
      Código: '999888',
      Nombre: 'Globos Metálicos',
      Bultos: 10,
      Piezas: 50,
      Total: 500,
    },
  ];

  const globalInv = aggregateGlobalInventory({
    Hogar: area1Items,
    Fiesta: area2Items,
  });

  assert.equal(globalInv.length, 2);
  const det = globalInv.find((i) => i.Código === '75012345');
  assert.ok(det);
  assert.equal(det.Bultos, 7);
  assert.equal(det.Total, 28);
  assert.equal(det.Área, 'Hogar, Fiesta');
  assert.ok(det._extraData?.Desglose?.includes('Hogar: 5b (20p)'));
  assert.ok(det._extraData?.Desglose?.includes('Fiesta: 2b (8p)'));
});

test('auditProduct reports breakdown and totals across areas', () => {
  const allAreas = {
    Inventario_General: [],
    Hogar: [
      {
        Fecha_Captura: '29/10 10:00',
        Área: 'Hogar',
        Código: '1001',
        Nombre: 'Sartén Teflón',
        Bultos: 2,
        Piezas: 6,
        Total: 12,
      },
    ],
    Almacen: [
      {
        Fecha_Captura: '29/10 11:00',
        Área: 'Almacen',
        Código: '1001',
        Nombre: 'Sartén Teflón',
        Bultos: 10,
        Piezas: 6,
        Total: 60,
      },
    ],
  };

  const audit = auditProduct('1001', allAreas, 'Hogar');
  assert.ok(audit);
  assert.equal(audit.sku, '1001');
  assert.equal(audit.nombre, 'Sartén Teflón');
  assert.equal(audit.stockGlobalBultos, 12);
  assert.equal(audit.stockGlobalPiezas, 72);
  assert.equal(audit.stockAreaBultos, 2);
  assert.equal(audit.stockAreaPiezas, 12);
  assert.equal(audit.desglosePorArea.length, 2);
});

test('filterInventory matches multiple tokens case-insensitive and accents', () => {
  const items: InventoryItem[] = [
    {
      Fecha_Captura: '29/10 10:00',
      Área: 'Juguetería',
      Código: '777888',
      Nombre: 'Camión Eléctrico Azul',
      Bultos: 1,
      Piezas: 1,
      Total: 1,
    },
    {
      Fecha_Captura: '29/10 10:05',
      Área: 'Hogar',
      Código: '555666',
      Nombre: 'Jabón En Polvo',
      Bultos: 4,
      Piezas: 12,
      Total: 48,
    },
  ];

  // Accent insensitive search
  const res1 = filterInventory(items, 'camion');
  assert.equal(res1.length, 1);
  assert.equal(res1[0].Código, '777888');

  // Multi-word search
  const res2 = filterInventory(items, 'jugueteria azul');
  assert.equal(res2.length, 1);

  // By code
  const res3 = filterInventory(items, '555');
  assert.equal(res3.length, 1);
  assert.equal(res3[0].Nombre, 'Jabón En Polvo');
});

test('parseImportedRows correctly maps columns from raw objects', () => {
  const rawRows = [
    {
      'SKU / Cod': '123456',
      'Descripcion Articulo': 'Caja Organizadora',
      'Cajas': '4',
      'Total Piezas': '40',
      'Costo': '45.50',
      'Pasillo': 'A-12',
    },
  ];

  const parsed = parseImportedRows(
    rawRows,
    {
      codigo: 'SKU / Cod',
      nombre: 'Descripcion Articulo',
      bultos: 'Cajas',
      piezas: 'Total Piezas',
      precio: 'Costo',
      conservarExtras: true,
    },
    'Almacen_Central'
  );

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].Código, '123456');
  assert.equal(parsed[0].Nombre, 'Caja Organizadora');
  assert.equal(parsed[0].Bultos, 4);
  assert.equal(parsed[0].Total, 40);
  assert.equal(parsed[0].Piezas, 10);
  assert.equal(parsed[0].Precio, 45.5);
  assert.equal(parsed[0]._extraData?.Pasillo, 'A-12');
});

test('cleanCode preserves alphanumeric SKUs while stripping whitespace from numeric barcodes', () => {
  assert.equal(cleanCode('  7501000123456  '), '7501000123456');
  assert.equal(cleanCode('mix-001'), 'MIX-001');
  assert.equal(cleanCode('pallet-a-12\r\n'), 'PALLET-A-12');
  assert.equal(cleanCode(null), '');
});

test('parsePrice correctly strips currency symbols and commas', () => {
  assert.equal(parsePrice('$1,450.50'), 1450.5);
  assert.equal(parsePrice('€ 25.00'), 25);
  assert.equal(parsePrice('$ 0.99'), 0.99);
  assert.equal(parsePrice(42), 42);
  assert.equal(parsePrice('invalid'), 0);
  assert.equal(parsePrice(null), 0);
});

test('parseExpirationDate parses Date objects and Excel serial dates', () => {
  assert.equal(parseExpirationDate('2026-11-20'), '2026-11-20');
  const d = new Date(2026, 10, 15);
  assert.equal(parseExpirationDate(d), '2026-11-15');
});

test('aggregateGlobalInventory preserves standalone items and handles alphanumeric SKUs cleanly', () => {
  const areaData = {
    Inventario_General: [
      {
        Fecha_Captura: '29/10 10:00',
        Área: 'BOTANA',
        Código: '7501000999999',
        Nombre: 'Papas Fritas 100g',
        Bultos: 3,
        Piezas: 10,
        Total: 30,
        Precio: 15.0,
      },
    ],
    Hogar: [
      {
        Fecha_Captura: '29/10 11:00',
        Área: 'Hogar',
        Código: 'MIX-001',
        Nombre: 'Caja Mixta Limpieza',
        Bultos: 1,
        Piezas: 12,
        Total: 12,
        Precio: 150.0,
      },
    ],
  };

  const consolidated = aggregateGlobalInventory(areaData);
  assert.equal(consolidated.length, 2);

  const papas = consolidated.find((i) => i.Código === '7501000999999');
  assert.ok(papas);
  assert.equal(papas.Total, 30);

  const mix = consolidated.find((i) => i.Código === 'MIX-001');
  assert.ok(mix);
  assert.equal(mix.Total, 12);
});

test('validateBarcodeFormat correctly validates EAN, UPC, and SKUs', () => {
  const ean = validateBarcodeFormat('7501000123456');
  assert.equal(ean.isValid, true);
  assert.equal(ean.format, 'EAN-13');

  const sku = validateBarcodeFormat('PALLET-BOX-09');
  assert.equal(sku.isValid, true);
  assert.equal(sku.format, 'ALPHANUMERIC-SKU');

  const empty = validateBarcodeFormat('');
  assert.equal(empty.isValid, false);
});

test('calculateStockHealth computes critical, low, and optimal stock states', () => {
  const zeroStock = calculateStockHealth(0, 100);
  assert.equal(zeroStock.status, 'critical');
  assert.equal(zeroStock.healthScore, 0);

  const lowStock = calculateStockHealth(4, 50);
  assert.equal(lowStock.status, 'low');
  assert.equal(lowStock.healthScore, 40);

  const optimalStock = calculateStockHealth(50, 20);
  assert.equal(optimalStock.status, 'optimal');
  assert.equal(optimalStock.healthScore, 100);
});

test('applyMermaApprovalDeduction resets single product to 0 without deleting', () => {
  const singleItem: InventoryItem[] = [
    {
      Fecha_Captura: '09/11 10:00',
      Área: 'Hogar',
      Código: '750100',
      Nombre: 'CLORO 1L',
      Bultos: 2,
      Piezas: 5,
      Total: 10,
      Caducidad: '2026-11-20',
    },
  ];

  // Deduct entire 10 pieces via merma
  const result = applyMermaApprovalDeduction(singleItem, {
    sku: '750100',
    cantidad: 10,
  });

  // Exactly 1 entry remains, reset in 0 and without caducidad
  assert.equal(result.length, 1);
  assert.equal(result[0].Total, 0);
  assert.equal(result[0].Bultos, 0);
  assert.equal(result[0].Piezas, 0);
  assert.equal(result[0].Caducidad, '');
  assert.equal(result[0].Código, '750100');
});

test('applyMermaApprovalDeduction eliminates exhausted clone and keeps remaining clone', () => {
  const clones: InventoryItem[] = [
    {
      Fecha_Captura: '09/11 10:00',
      Área: 'Hogar',
      Código: '750200',
      Nombre: 'LECHE ENTERA 1L',
      Bultos: 1,
      Piezas: 12,
      Total: 12,
      Caducidad: '2026-11-15', // Expires first
    },
    {
      Fecha_Captura: '09/11 10:05',
      Área: 'Hogar',
      Código: '750200',
      Nombre: 'LECHE ENTERA 1L',
      Bultos: 2,
      Piezas: 12,
      Total: 24,
      Caducidad: '2026-12-30', // Later batch
    },
  ];

  // Deduct batch expiring 2026-11-15 (12 pieces)
  const afterFirstDeduction = applyMermaApprovalDeduction(clones, {
    sku: '750200',
    cantidad: 12,
    caducidad: '2026-11-15',
  });

  // First clone was exhausted and eliminated because multiple clones existed!
  assert.equal(afterFirstDeduction.length, 1);
  assert.equal(afterFirstDeduction[0].Caducidad, '2026-12-30');
  assert.equal(afterFirstDeduction[0].Total, 24);

  // Now deduct second batch (24 pieces)
  const afterSecondDeduction = applyMermaApprovalDeduction(afterFirstDeduction, {
    sku: '750200',
    cantidad: 24,
    caducidad: '2026-12-30',
  });

  // Only 1 clone was left, so it was NOT eliminated: reset to 0 without caducidad
  assert.equal(afterSecondDeduction.length, 1);
  assert.equal(afterSecondDeduction[0].Total, 0);
  assert.equal(afterSecondDeduction[0].Caducidad, '');
  assert.equal(afterSecondDeduction[0].Código, '750200');
});

test('syncExpiringProductsArea gathers products with 20 days advance notice without moving them', () => {
  const today = new Date();
  const d5 = new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0];
  const d18 = new Date(today.getTime() + 18 * 86400000).toISOString().split('T')[0];
  const d40 = new Date(today.getTime() + 40 * 86400000).toISOString().split('T')[0];

  const db: Record<string, InventoryItem[]> = {
    Hogar: [
      { Fecha_Captura: '09/11', Área: 'Hogar', Código: 'EXP-1', Nombre: 'Yogurt', Bultos: 1, Piezas: 5, Total: 5, Caducidad: d5 },
      { Fecha_Captura: '09/11', Área: 'Hogar', Código: 'NOT-EXP', Nombre: 'Arroz', Bultos: 1, Piezas: 10, Total: 10, Caducidad: d40 },
    ],
    Fiesta: [
      { Fecha_Captura: '09/11', Área: 'Fiesta', Código: 'EXP-2', Nombre: 'Pastel', Bultos: 1, Piezas: 2, Total: 2, Caducidad: d18 },
    ],
  };

  const expiring = syncExpiringProductsArea(db, 20);
  assert.equal(expiring.length, 2);
  assert.ok(expiring.some((i) => i.Código === 'EXP-1'));
  assert.ok(expiring.some((i) => i.Código === 'EXP-2'));
  assert.ok(!expiring.some((i) => i.Código === 'NOT-EXP'));
});

test('computeHistoricalFlow correctly aggregates entries, exits, and net balance across time points', () => {
  const refDate = new Date('2026-11-09T12:00:00Z');
  const movements = [
    {
      id: 'm1',
      timestamp: '2026-11-09T10:00:00Z',
      date: '2026-11-09',
      type: 'entrada' as const,
      sku: 'PROD-A',
      nombre: 'Galletas',
      cantidadPiezas: 100,
      cantidadBultos: 5,
      valor: 2000,
      area: 'Abarrotes',
    },
    {
      id: 'm2',
      timestamp: '2026-11-09T11:00:00Z',
      date: '2026-11-09',
      type: 'salida' as const,
      sku: 'PROD-A',
      nombre: 'Galletas',
      cantidadPiezas: 30,
      cantidadBultos: 1,
      valor: 600,
      area: 'Abarrotes',
    },
    {
      id: 'm3',
      timestamp: '2026-11-08T09:00:00Z',
      date: '2026-11-08',
      type: 'entrada' as const,
      sku: 'PROD-B',
      nombre: 'Refresco',
      cantidadPiezas: 50,
      cantidadBultos: 2,
      valor: 1500,
      area: 'Bebidas',
    },
  ];

  const flow7d = computeHistoricalFlow(movements, [], [], { range: '7d', metric: 'piezas' }, refDate);
  assert.equal(flow7d.length, 7);

  // Today (2026-11-09) is the last point
  const todayPoint = flow7d[flow7d.length - 1];
  assert.equal(todayPoint.fullDate, '2026-11-09');
  assert.ok(todayPoint.entradas >= 100);
  assert.ok(todayPoint.salidas >= 30);
  assert.equal(todayPoint.neto, todayPoint.entradas - todayPoint.salidas);

  // Yesterday (2026-11-08) is the second to last point
  const yesterdayPoint = flow7d[flow7d.length - 2];
  assert.equal(yesterdayPoint.fullDate, '2026-11-08');
  assert.ok(yesterdayPoint.entradas >= 50);

  // Test with months range
  const flowMonths = computeHistoricalFlow(movements, [], [], { range: 'meses', metric: 'piezas' }, refDate);
  assert.equal(flowMonths.length, 6);
});


