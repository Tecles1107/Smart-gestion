import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanNum,
  calculateTotal,
  calculatePiecesPerBundle,
  aggregateGlobalInventory,
  auditProduct,
  filterInventory,
  parseImportedRows,
  sortInventoryItems,
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
