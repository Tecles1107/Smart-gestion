/**
 * Dedicated Scanner Engine & Stock Health Analytics Domain Module
 */

export interface ScanResultEvent {
  rawCode: string;
  cleanCode: string;
  timestamp: string;
  isValid: boolean;
  scanType: 'barcode' | 'qr' | 'manual' | 'image';
  mode: 'entrada' | 'salida' | 'consulta';
}

export interface StockHealthMetrics {
  status: 'critical' | 'low' | 'optimal' | 'excess';
  healthScore: number; // 0 - 100
  totalPieces: number;
  totalValue: number;
  recommendedMinStock: number;
  recommendedMaxStock: number;
  daysToExpiration?: number;
  warningFlags: string[];
}

/**
 * Validates standard industrial barcode formats (EAN-13, EAN-8, UPC-A, Code-128, Alphanumeric SKUs)
 */
export function validateBarcodeFormat(input: string): { isValid: boolean; format: string; message: string } {
  const code = (input || '').trim();
  if (!code) {
    return { isValid: false, format: 'Desconocido', message: 'El código está vacío.' };
  }

  // Pure digits: Check EAN-13, EAN-8, UPC-A
  if (/^\d+$/.test(code)) {
    if (code.length === 13) {
      return { isValid: true, format: 'EAN-13', message: 'Código EAN-13 válido' };
    }
    if (code.length === 8) {
      return { isValid: true, format: 'EAN-8', message: 'Código EAN-8 válido' };
    }
    if (code.length === 12) {
      return { isValid: true, format: 'UPC-A', message: 'Código UPC-A válido' };
    }
    if (code.length >= 3 && code.length <= 18) {
      return { isValid: true, format: 'NUMERIC-BARCODE', message: `Código numérico (${code.length} dígitos)` };
    }
  }

  // Alphanumeric industrial SKUs
  if (/^[A-Z0-9\-_./#]+$/i.test(code)) {
    return { isValid: true, format: 'ALPHANUMERIC-SKU', message: 'SKU Alfanumérico industrial válido' };
  }

  return { isValid: true, format: 'CUSTOM-CODE', message: 'Formato de código personalizado' };
}

/**
 * Calculates stock health, minimum safety levels, and risk metrics for any inventory item
 */
export function calculateStockHealth(
  totalPieces: number,
  unitPrice: number = 0,
  expirationDate?: string
): StockHealthMetrics {
  const flags: string[] = [];
  let score = 100;
  let status: 'critical' | 'low' | 'optimal' | 'excess' = 'optimal';

  const recommendedMinStock = 10;
  const recommendedMaxStock = 500;

  if (totalPieces === 0) {
    status = 'critical';
    score = 0;
    flags.push('AGOTADO: Sin existencias en almacén');
  } else if (totalPieces < recommendedMinStock) {
    status = 'low';
    score = 40;
    flags.push(`STOCK BAJO: Quedan ${totalPieces} pzs (Mínimo sugerido: ${recommendedMinStock})`);
  } else if (totalPieces > recommendedMaxStock) {
    status = 'excess';
    score = 75;
    flags.push(`SOBRESTOCK: ${totalPieces} pzs acumuladas (Máximo sugerido: ${recommendedMaxStock})`);
  }

  let daysLeft: number | undefined = undefined;
  if (expirationDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    daysLeft = diffDays;

    if (diffDays <= 0) {
      score = Math.min(score, 10);
      flags.push('PRODUCTO VENCIDO');
      status = 'critical';
    } else if (diffDays <= 20) {
      score = Math.min(score, 30);
      flags.push(`CADUCIDAD PRÓXIMA: Vence en ${diffDays} días`);
      if (status !== 'critical') status = 'low';
    }
  }

  const totalValue = (Number(unitPrice) || 0) * totalPieces;

  return {
    status,
    healthScore: score,
    totalPieces,
    totalValue,
    recommendedMinStock,
    recommendedMaxStock,
    daysToExpiration: daysLeft,
    warningFlags: flags,
  };
}

/**
 * Scanner cooldown state helper to prevent duplicate phantom triggers within threshold
 */
export class ScannerCooldownManager {
  private lastScannedMap = new Map<string, number>();
  private cooldownMs: number;

  constructor(cooldownMs: number = 1500) {
    this.cooldownMs = cooldownMs;
  }

  public shouldProcess(code: string): boolean {
    const now = Date.now();
    const lastTime = this.lastScannedMap.get(code) || 0;
    if (now - lastTime < this.cooldownMs) {
      return false;
    }
    this.lastScannedMap.set(code, now);
    return true;
  }

  public reset(): void {
    this.lastScannedMap.clear();
  }
}
