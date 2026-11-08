import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem } from '../types/inventory';
import { calculatePiecesPerBundle } from './inventoryLogic';

export type ExportDocType = 'excel' | 'pdf' | 'word';
export type ExportFormat = 'basico' | 'completo';

export function exportInventory(
  items: InventoryItem[],
  activeArea: string,
  docType: ExportDocType,
  format: ExportFormat
) {
  if (!items || items.length === 0) {
    alert('No hay registros en esta área para exportar.');
    return;
  }

  const cleanAreaName = activeArea.replace(/_/g, ' ');
  const todayStr = new Date().toISOString().slice(0, 10);
  const fileNameBase = `Inventario_${activeArea}_${format.toUpperCase()}_${todayStr}`;

  if (docType === 'excel') {
    const data = format === 'basico'
      ? items.map((i) => ({
          'CÓDIGO (UPC/SKU)': i.Código,
          'NOMBRE PRODUCTO': i.Nombre,
          'TOTAL PIEZAS': Number(i.Total) || 0,
        }))
      : items.map((i) => {
          const precio = Number(i.Precio) || 0;
          const total = Number(i.Total) || 0;
          return {
            'FECHA': i.Fecha_Captura,
            'ÁREA': i.Área || cleanAreaName,
            'CÓDIGO (UPC/SKU)': i.Código,
            'NOMBRE PRODUCTO': i.Nombre,
            'BULTOS': Number(i.Bultos) || 0,
            'PZ/BTO': calculatePiecesPerBundle(i),
            'TOTAL PIEZAS': total,
            'PRECIO UNIT': precio,
            'VALOR TOTAL ($)': precio * total,
            'CADUCIDAD': i.Caducidad || '',
            ...(i._extraData ? { 'NOTAS / EXTRA': JSON.stringify(i._extraData) } : {}),
          };
        });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-adjust column widths so nothing is truncated
    const colWidths = Object.keys(data[0] || {}).map((key) => {
      let maxLen = key.length;
      data.forEach((row: any) => {
        const val = String(row[key] || '');
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 55) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanAreaName.slice(0, 31));
    XLSX.writeFile(workbook, `${fileNameBase}.xlsx`);
    return;
  }

  if (docType === 'pdf') {
    const doc = new jsPDF({
      orientation: format === 'completo' ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'letter',
    });

    // Header styling
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`SMART SCANNER PRO - INVENTARIO`, 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 110, 125);
    doc.text(`Área: ${cleanAreaName} | Fecha de Emisión: ${todayStr} | Formato: ${format.toUpperCase()}`, 40, 56);

    const headers = format === 'basico'
      ? [['#', 'CÓDIGO / SKU', 'NOMBRE DEL PRODUCTO', 'TOTAL PIEZAS']]
      : [['FECHA', 'ÁREA', 'CÓDIGO', 'NOMBRE PRODUCTO', 'BULTOS', 'PZ/BTO', 'TOTAL', 'PRECIO', 'SUBTOTAL', 'CAD']];

    const body = format === 'basico'
      ? items.map((it, idx) => [
          String(idx + 1),
          it.Código,
          it.Nombre,
          String(it.Total || 0),
        ])
      : items.map((it) => {
          const precio = Number(it.Precio) || 0;
          const tot = Number(it.Total) || 0;
          return [
            it.Fecha_Captura || '',
            it.Área || cleanAreaName,
            it.Código,
            it.Nombre,
            String(it.Bultos || 0),
            String(calculatePiecesPerBundle(it)),
            String(tot),
            precio > 0 ? `$${precio.toFixed(2)}` : '-',
            precio > 0 ? `$${(precio * tot).toFixed(2)}` : '-',
            it.Caducidad || '-',
          ];
        });

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 70,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 5,
        overflow: 'linebreak',
      },
      columnStyles: format === 'completo' ? {
        0: { cellWidth: 55 },
        1: { cellWidth: 65 },
        2: { cellWidth: 70 },
        3: { cellWidth: 145 },
        4: { cellWidth: 45 },
        5: { cellWidth: 45 },
        6: { cellWidth: 50 },
        7: { cellWidth: 50 },
        8: { cellWidth: 55 },
        9: { cellWidth: 55 },
      } : {
        0: { cellWidth: 35 },
        1: { cellWidth: 90 },
        2: { cellWidth: 240 },
        3: { cellWidth: 85 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`${fileNameBase}.pdf`);
    return;
  }

  if (docType === 'word') {
    const tableHeader = format === 'basico'
      ? `<tr><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">CÓDIGO</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">NOMBRE</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:right;">TOTAL PZAS</th></tr>`
      : `<tr><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">FECHA</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">ÁREA</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">CÓDIGO</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">NOMBRE</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:center;">BULTOS</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:right;">TOTAL</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:right;">PRECIO</th><th style="background:#1e293b;color:#fff;padding:8px;text-align:left;">CADUCIDAD</th></tr>`;

    const tableRows = items.map((i) => {
      if (format === 'basico') {
        return `<tr><td style="mso-number-format:'\\@';padding:6px;width:120px;">${i.Código}</td><td style="padding:6px;width:300px;">${i.Nombre}</td><td style="padding:6px;text-align:right;width:100px;">${i.Total}</td></tr>`;
      }
      return `<tr><td style="padding:6px;width:90px;">${i.Fecha_Captura}</td><td style="padding:6px;width:100px;">${i.Área || cleanAreaName}</td><td style="mso-number-format:'\\@';padding:6px;width:90px;">${i.Código}</td><td style="padding:6px;width:180px;">${i.Nombre}</td><td style="padding:6px;text-align:center;width:60px;">${i.Bultos}</td><td style="padding:6px;text-align:right;font-weight:bold;width:70px;">${i.Total}</td><td style="padding:6px;text-align:right;width:70px;">$${Number(i.Precio || 0).toFixed(2)}</td><td style="padding:6px;width:80px;">${i.Caducidad || ''}</td></tr>`;
    }).join('');

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Inventario ${cleanAreaName}</title></head>
      <body style="font-family:Arial,sans-serif;font-size:12px;">
        <h2 style="color:#0f172a;">Smart Scanner Industrial PRO - Inventario</h2>
        <p><b>Área:</b> ${cleanAreaName} | <b>Fecha:</b> ${todayStr} | <b>Registros:</b> ${items.length}</p>
        <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;table-layout:auto;">
          ${tableHeader}
          ${tableRows}
        </table>
      </body>
    </html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileNameBase}.doc`;
    link.click();
    return;
  }
}
