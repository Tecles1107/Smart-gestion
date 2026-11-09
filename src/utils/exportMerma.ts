import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MermaRecord } from '../types/inventory';

export type MermaExportType = 'excel' | 'pdf' | 'word';

export function exportMermaRecords(
  records: MermaRecord[],
  type: MermaExportType
): void {
  try {
    if (records.length === 0) {
      console.warn('No records to export');
      return;
    }

    const today = new Date();
    const fileName = `Reporte_Merma_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    if (type === 'excel') {
      const data = records.map(r => ({
        'ID': r.id,
        'FECHA': r.fecha,
        'UPC / SKU': r.sku,
        'PRODUCTO': r.nombre,
        'CANTIDAD': r.cantidad,
        'MOTIVO': r.motivo,
        'RESPONSABLE': r.responsable,
        'ESTADO': r.status.toUpperCase(),
        'EVIDENCIA': r.evidencia ? 'CON FOTO' : 'SIN FOTO',
        'APROBACIÓN': '[  ]'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Merma');
      
      // Auto-width
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length + 2, 15)
      }));
      ws['!cols'] = colWidths;

      // Manual blob creation for better iframe compatibility
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    if (type === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape' });
      
      doc.setFontSize(18);
      doc.text('REPORTE DE MERMA - SMART SCANNER PRO', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 28);

      const body = records.map(r => [
        r.sku,
        r.nombre,
        r.cantidad.toString(),
        r.motivo,
        r.responsable,
        r.status.toUpperCase(),
        r.evidencia ? 'SÍ' : 'NO',
        '[  ]'
      ]);

      autoTable(doc, {
        head: [['UPC / SKU', 'PRODUCTO', 'CANT', 'MOTIVO', 'RESPONSABLE', 'ESTADO', 'EVIDENCIA', 'APROB.']],
        body: body,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72] }, // Rose-600
        styles: { fontSize: 8, cellPadding: 2, minCellHeight: 14, valign: 'middle' },
        columnStyles: {
          1: { cellWidth: 50 }, // Name
          3: { cellWidth: 55 }, // Reason
          6: { cellWidth: 20, halign: 'center' }, // Evidence photo
          7: { cellWidth: 15, halign: 'center' } // Checkbox
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
            const record = records[data.row.index];
            if (record?.evidencia && record.evidencia.startsWith('data:image/')) {
              try {
                // Determine format
                const format = record.evidencia.includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(record.evidencia, format, data.cell.x + 4, data.cell.y + 2, 10, 10);
              } catch {
                // fallback gracefully
              }
            }
          }
        }
      });

      // Manual blob creation for better iframe compatibility
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    if (type === 'word') {
      const tableHeader = `
        <tr style="background-color: #e11d48; color: white; font-weight: bold;">
          <th style="padding: 10px; border: 1px solid #ccc;">UPC/SKU</th>
          <th style="padding: 10px; border: 1px solid #ccc;">PRODUCTO</th>
          <th style="padding: 10px; border: 1px solid #ccc;">CANT</th>
          <th style="padding: 10px; border: 1px solid #ccc;">MOTIVO</th>
          <th style="padding: 10px; border: 1px solid #ccc;">RESPONSABLE</th>
          <th style="padding: 10px; border: 1px solid #ccc;">FOTO</th>
          <th style="padding: 10px; border: 1px solid #ccc;">APROBACIÓN</th>
        </tr>
      `;

      const tableRows = records.map(r => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; mso-number-format:'\\@';">${r.sku}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${r.nombre}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${r.cantidad}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${r.motivo}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${r.responsable}</td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">
            ${r.evidencia && r.evidencia.startsWith('data:image/') 
              ? `<img src="${r.evidencia}" width="50" height="50" style="object-fit:cover; border-radius:4px; display:inline-block;" alt="Evidencia" />` 
              : '<span style="color:#888; font-size:11px;">Sin foto</span>'}
          </td>
          <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 18px;">&#9744;</td>
        </tr>
      `).join('');

      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'></head>
        <body style="font-family: Arial, sans-serif;">
          <h2 style="color: #e11d48;">Reporte de Merma Industrial</h2>
          <p><strong>Generado el:</strong> ${new Date().toLocaleString()}</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${tableHeader}
            ${tableRows}
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error in exportMermaRecords:', error);
  }
}
