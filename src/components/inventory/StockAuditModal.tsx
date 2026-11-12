import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, BusinessSettings, User } from '../../types';
import { formatKsh } from '../../lib/utils';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Sliders,
  Eye,
  X,
  RotateCcw,
  CheckCircle2,
  Filter,
  Download,
  Loader2,
} from 'lucide-react';

export type AuditPreset = 'valuation' | 'stocktake' | 'catalogue' | 'reorder';

interface StockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: BusinessSettings | null;
  user: User | null;
  initialPreset?: AuditPreset;
  instantPrint?: boolean;
}

export const StockAuditModal: React.FC<StockAuditModalProps> = ({
  isOpen,
  onClose,
  products,
  settings,
  user,
  initialPreset = 'valuation',
  instantPrint = false,
}) => {
  // Preset selection
  const [preset, setPreset] = useState<AuditPreset>(initialPreset);
  const [activeView, setActiveView] = useState<'preview' | 'config'>('preview');

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'depleted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Column toggles
  const [colCostPrice, setColCostPrice] = useState<boolean>(true);
  const [colSellingPrice, setColSellingPrice] = useState<boolean>(true);
  const [colValuation, setColValuation] = useState<boolean>(true);
  const [colMargins, setColMargins] = useState<boolean>(true);
  const [colSku, setColSku] = useState<boolean>(true);
  const [colPhysicalCount, setColPhysicalCount] = useState<boolean>(false);
  const [colSignOff, setColSignOff] = useState<boolean>(true);

  // Audit Header metadata
  const [auditorName, setAuditorName] = useState<string>(user?.name || 'System Administrator');
  const [auditRefId, setAuditRefId] = useState<string>('');
  const [auditNotes, setAuditNotes] = useState<string>(
    'Official stock valuation and physical inventory audit conducted for Bright Cyber & ICT Centre.'
  );

  // PDF Generation loading state
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Generate Reference ID (STK-AUDIT-YYYYMMDD-XXXX)
  const generateNewAuditId = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `STK-AUDIT-${yyyy}${mm}${dd}-${randomHex}`;
  };

  useEffect(() => {
    if (isOpen && !auditRefId) {
      setAuditRefId(generateNewAuditId());
    }
  }, [isOpen]);

  // Apply preset configurations
  const applyPresetConfig = (p: AuditPreset) => {
    setPreset(p);
    if (p === 'valuation') {
      setColCostPrice(true);
      setColSellingPrice(true);
      setColValuation(true);
      setColMargins(true);
      setColSku(true);
      setColPhysicalCount(false);
      setColSignOff(true);
      setStockStatusFilter('all');
      setAuditNotes('Comprehensive inventory valuation audit detailing cost bases, retail value, and gross margin potential.');
    } else if (p === 'stocktake') {
      setColCostPrice(false);
      setColSellingPrice(true);
      setColValuation(false);
      setColMargins(false);
      setColSku(true);
      setColPhysicalCount(true);
      setColSignOff(true);
      setStockStatusFilter('all');
      setAuditNotes('Floor stocktake counting sheet. Count physical stock and record variances in the designated inspection boxes.');
    } else if (p === 'catalogue') {
      setColCostPrice(false);
      setColSellingPrice(true);
      setColValuation(false);
      setColMargins(false);
      setColSku(true);
      setColPhysicalCount(false);
      setColSignOff(false);
      setStockStatusFilter('in_stock');
      setAuditNotes('Public retail price catalogue and inventory availability directory.');
    } else if (p === 'reorder') {
      setColCostPrice(true);
      setColSellingPrice(true);
      setColValuation(true);
      setColMargins(true);
      setColSku(true);
      setColPhysicalCount(false);
      setColSignOff(true);
      setStockStatusFilter('low_stock');
      setAuditNotes('Priority procurement requisition sheet filtering items at or below minimum threshold level.');
    }
  };

  // Extract unique categories
  const categories = Array.from(new Set(products.map((p) => p.category_name || 'General'))).sort();

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && (p.category_name || 'General') !== selectedCategory) {
      return false;
    }

    if (stockStatusFilter === 'in_stock' && p.stock_quantity <= p.minimum_stock) {
      return false;
    }
    if (stockStatusFilter === 'low_stock' && (p.stock_quantity > p.minimum_stock || p.stock_quantity <= 0)) {
      return false;
    }
    if (stockStatusFilter === 'depleted' && p.stock_quantity > 0) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchCategory = (p.category_name || '').toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCategory) return false;
    }

    return true;
  });

  // Calculate totals
  const totalItemsCount = filteredProducts.length;
  const totalUnits = filteredProducts.reduce((sum, p) => sum + p.stock_quantity, 0);
  const totalCostValuation = filteredProducts.reduce((sum, p) => sum + p.stock_quantity * p.cost_price, 0);
  const totalRetailValuation = filteredProducts.reduce((sum, p) => sum + p.stock_quantity * p.selling_price, 0);
  const totalPotentialProfit = Math.max(0, totalRetailValuation - totalCostValuation);
  const averageMarginPct = totalRetailValuation > 0 ? (totalPotentialProfit / totalRetailValuation) * 100 : 0;

  const currentDateFormatted = new Date().toLocaleDateString('en-KE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const currentTimeFormatted = new Date().toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Helper to load logo as base64 for jsPDF
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return '';
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  // Download PDF using native jsPDF vector engine & autoTable (A4 Portrait)
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Try loading official logo
      const logoBase64 = await getBase64ImageFromUrl(
        '/assets/aistudio/25Sep2424_Simon_Pro_Upload__6279a8d4.jpg'
      );

      let headerTextX = 14;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'JPEG', 14, 11, 16, 16);
          headerTextX = 33;
        } catch (imgErr) {
          console.warn('Could not render logo in PDF, continuing with text:', imgErr);
        }
      }

      // 1. Header Information
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // #0F172A
      doc.text('BRIGHT CYBER & ICT CENTRE', headerTextX, 16.5);

      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235); // #2563EB
      doc.text('Bright Cyber Global Tech • Retail Point of Sale System', headerTextX, 20.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139); // #64748B
      doc.text(
        `${settings?.address || 'Biashara Street, Nairobi, Kenya'} • Tel: ${settings?.phone || '+254 712 345 678'}`,
        headerTextX,
        24.8
      );
      doc.text(
        `Email: ${settings?.email || 'info@brightcyber.co.ke'}`,
        headerTextX,
        28.3
      );

      // Right-aligned Document Metadata Box
      const presetTitle =
        preset === 'valuation'
          ? 'OFFICIAL STOCK VALUATION'
          : preset === 'stocktake'
          ? 'STOCKTAKE COUNTING SHEET'
          : preset === 'catalogue'
          ? 'RETAIL PRICE CATALOGUE'
          : 'REORDER PROCUREMENT LIST';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(presetTitle, 196, 16.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Ref: ${auditRefId || 'STK-AUDIT-OFFICIAL'}`, 196, 20.8, { align: 'right' });
      doc.text(`Date: ${currentDateFormatted} ${currentTimeFormatted}`, 196, 24.8, { align: 'right' });
      doc.text(`Auditor: ${auditorName}`, 196, 28.3, { align: 'right' });

      // Horizontal divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, 31, 196, 31);

      // 2. Audit Scope Box
      let currentY = 34;
      if (auditNotes) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(15, 23, 42);
        doc.text('AUDIT SCOPE & INSTRUCTIONS:', 17, currentY + 5.2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitNotes = doc.splitTextToSize(auditNotes, 136);
        doc.text(splitNotes[0] || auditNotes, 56, currentY + 5.2);
        currentY += 10.5;
      }

      // 3. Metric Summary Cards (4 blocks)
      const cardWidth = 43.5;
      const cardHeight = 10.5;
      const cardGap = 2.6;
      const metrics = [
        { label: 'TOTAL SKUs', value: `${totalItemsCount}` },
        { label: 'STOCK UNITS', value: `${totalUnits.toLocaleString()}` },
        {
          label: 'RETAIL VALUATION',
          value: `KES ${totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
          label: colCostPrice ? 'COST VALUATION' : 'EST. MARGIN',
          value: colCostPrice
            ? `KES ${totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `KES ${totalPotentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      ];

      metrics.forEach((m, idx) => {
        const cardX = 14 + idx * (cardWidth + cardGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1, 1, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, cardX + 3, currentY + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(m.value, cardX + 3, currentY + 8.2);
      });
      currentY += 13.5;

      // 4. Build Table Headers and Rows
      const headers: string[] = ['#'];
      if (colSku) headers.push('SKU / Code');
      headers.push('Product Name', 'Category', 'Unit', 'Qty');
      if (colPhysicalCount) headers.push('Count [   ]', 'Variance');
      if (colCostPrice) headers.push('Cost (KES)');
      if (colSellingPrice) headers.push('Price (KES)');
      if (colValuation) headers.push('Cost Val', 'Retail Val');
      if (colMargins) headers.push('Margin', '%');
      headers.push('Status');

      const rows = filteredProducts.map((p, idx) => {
        const r: (string | number)[] = [idx + 1];
        if (colSku) r.push(p.sku);
        r.push(p.name, p.category_name || 'General', p.unit, p.stock_quantity);
        if (colPhysicalCount) r.push('[       ]', '');
        if (colCostPrice) r.push(p.cost_price.toFixed(2));
        if (colSellingPrice) r.push(p.selling_price.toFixed(2));
        if (colValuation) {
          r.push((p.stock_quantity * p.cost_price).toFixed(2));
          r.push((p.stock_quantity * p.selling_price).toFixed(2));
        }
        if (colMargins) {
          const margin = Math.max(0, p.selling_price - p.cost_price);
          const marginPct = p.selling_price > 0 ? (margin / p.selling_price) * 100 : 0;
          r.push((margin * p.stock_quantity).toFixed(2));
          r.push(`${marginPct.toFixed(1)}%`);
        }
        const status =
          p.stock_quantity <= 0 ? 'Out of Stock' : p.stock_quantity <= p.minimum_stock ? 'Low Stock' : 'In Stock';
        r.push(status);
        return r;
      });

      const totals: (string | number)[] = ['TOTAL'];
      if (colSku) totals.push('');
      totals.push('', '', '', totalUnits);
      if (colPhysicalCount) totals.push('', '');
      if (colCostPrice) totals.push('');
      if (colSellingPrice) totals.push('');
      if (colValuation) {
        totals.push(totalCostValuation.toFixed(2));
        totals.push(totalRetailValuation.toFixed(2));
      }
      if (colMargins) {
        totals.push(totalPotentialProfit.toFixed(2));
        totals.push(`${averageMarginPct.toFixed(1)}%`);
      }
      totals.push('');

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: rows,
        foot: [totals],
        theme: 'grid',
        styles: {
          fontSize: 6,
          cellPadding: 1.2,
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          font: 'helvetica',
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6.2,
          halign: 'center',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 6.2,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14, top: 16, bottom: 18 },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`Bright Cyber & ICT Centre • ${presetTitle} • Ref: ${auditRefId}`, 14, 10);
            doc.text(`Page ${data.pageNumber}`, 196, 10, { align: 'right' });
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(14, 12, 196, 12);
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            'Bright Cyber Global Tech • Official Stock Valuation & Inventory Audit Sheet (Portrait)',
            14,
            291
          );
          doc.text(
            `Generated: ${currentDateFormatted} ${currentTimeFormatted} • Auditor: ${auditorName}`,
            196,
            291,
            { align: 'right' }
          );
        },
      });

      // 5. Manager Certification / Sign-off Block (if enabled)
      if (colSignOff) {
        let finalY = (doc as any).lastAutoTable?.finalY || 200;
        if (finalY > 248) {
          doc.addPage();
          finalY = 20;
        } else {
          finalY += 8;
        }

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, finalY, 182, 26, 1.5, 1.5, 'FD');

        // Column 1: Prepared By
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        doc.text('1. PREPARED BY (AUDITOR)', 18, finalY + 5.5);
        doc.setDrawColor(203, 213, 225);
        doc.line(18, finalY + 16, 68, finalY + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text(`Signature & Date (${auditorName})`, 18, finalY + 20);

        // Column 2: Verified By
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('2. VERIFIED BY (SUPERVISOR)', 76, finalY + 5.5);
        doc.line(76, finalY + 16, 126, finalY + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text('Store Manager / Supervisor Signature', 76, finalY + 20);

        // Column 3: Official Stamp & Approval
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('3. OFFICIAL STORE STAMP & APPROVAL', 134, finalY + 5.5);
        doc.rect(134, finalY + 8, 58, 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(148, 163, 184);
        doc.text('[ AFFIX OFFICIAL STAMP HERE ]', 163, finalY + 16, { align: 'center' });
      }

      const filename = `${auditRefId || 'bright-cyber-stock-audit'}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      console.error('PDF download error:', err);
      // Fallback: trigger browser print
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Instant print/download effect if requested
  useEffect(() => {
    if (isOpen && instantPrint) {
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, instantPrint]);

  if (!isOpen) return null;

  // Export to Excel with custom columns
  const handleExportCustomExcel = () => {
    const wsData: any[][] = [
      ['BRIGHT CYBER GLOBAL TECH'],
      ['BRIGHT CYBER & ICT CENTRE — STOCK AUDIT & VALUATION REPORT (PORTRAIT)'],
      [`Audit Ref: ${auditRefId}`, `Date: ${currentDateFormatted} ${currentTimeFormatted}`, `Auditor: ${auditorName}`],
      [`Address: ${settings?.address || 'Biashara Street, Nairobi, Kenya'}`, `Tel: ${settings?.phone || '+254 712 345 678'}`, `Email: ${settings?.email || 'info@brightcyber.co.ke'}`],
      [`Notes: ${auditNotes}`],
      [],
      [
        `Total SKUs: ${totalItemsCount}`,
        `Total Units: ${totalUnits}`,
        ...(colCostPrice ? [`Cost Valuation: KES ${totalCostValuation.toFixed(2)}`] : []),
        `Retail Valuation: KES ${totalRetailValuation.toFixed(2)}`,
        ...(colMargins ? [`Potential Margin: KES ${totalPotentialProfit.toFixed(2)} (${averageMarginPct.toFixed(1)}%)`] : []),
      ],
      [],
    ];

    // Header row
    const headers: string[] = ['#'];
    if (colSku) headers.push('SKU / Code');
    headers.push('Product Name', 'Category', 'Unit', 'Qty');
    if (colPhysicalCount) headers.push('Physical Count [ ___ ]', 'Variance');
    if (colCostPrice) headers.push('Unit Cost (KES)');
    if (colSellingPrice) headers.push('Unit Price (KES)');
    if (colValuation) headers.push('Total Cost Value (KES)', 'Total Retail Value (KES)');
    if (colMargins) headers.push('Gross Margin (KES)', 'Margin %');
    headers.push('Stock Status');
    wsData.push(headers);

    filteredProducts.forEach((p, idx) => {
      const row: any[] = [idx + 1];
      if (colSku) {
        row.push(p.sku);
      }
      row.push(p.name, p.category_name || 'General', p.unit, p.stock_quantity);

      if (colPhysicalCount) {
        row.push('', '');
      }
      if (colCostPrice) {
        row.push(Number(p.cost_price.toFixed(2)));
      }
      if (colSellingPrice) {
        row.push(Number(p.selling_price.toFixed(2)));
      }
      if (colValuation) {
        row.push(Number((p.stock_quantity * p.cost_price).toFixed(2)));
        row.push(Number((p.stock_quantity * p.selling_price).toFixed(2)));
      }
      if (colMargins) {
        const marginKES = Math.max(0, p.selling_price - p.cost_price);
        const marginPct = p.selling_price > 0 ? (marginKES / p.selling_price) * 100 : 0;
        row.push(Number((marginKES * p.stock_quantity).toFixed(2)));
        row.push(`${marginPct.toFixed(1)}%`);
      }
      const status = p.stock_quantity <= 0 ? 'Out of Stock' : p.stock_quantity <= p.minimum_stock ? 'Low Stock' : 'Optimal';
      row.push(status);
      wsData.push(row);
    });

    // Totals row
    const totalsRow: any[] = ['TOTALS'];
    if (colSku) totalsRow.push('');
    totalsRow.push('', '', '', totalUnits);
    if (colPhysicalCount) totalsRow.push('', '');
    if (colCostPrice) totalsRow.push('');
    if (colSellingPrice) totalsRow.push('');
    if (colValuation) {
      totalsRow.push(Number(totalCostValuation.toFixed(2)));
      totalsRow.push(Number(totalRetailValuation.toFixed(2)));
    }
    if (colMargins) {
      totalsRow.push(Number(totalPotentialProfit.toFixed(2)));
      totalsRow.push(`${averageMarginPct.toFixed(1)}%`);
    }
    totalsRow.push('');
    wsData.push(totalsRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Audit');
    XLSX.writeFile(wb, `${auditRefId}.xlsx`);
  };

  // Export to CSV
  const handleExportCustomCsv = () => {
    const csvRows: string[] = [];
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    csvRows.push(['BRIGHT CYBER GLOBAL TECH — STOCK AUDIT'].map(escapeCsv).join(','));
    csvRows.push([`Audit Ref: ${auditRefId}`, `Date: ${currentDateFormatted}`, `Auditor: ${auditorName}`].map(escapeCsv).join(','));
    csvRows.push('');

    // Headers
    const headers: string[] = ['#'];
    if (colSku) headers.push('SKU');
    headers.push('Product Name', 'Category', 'Unit', 'Qty');
    if (colPhysicalCount) headers.push('Physical Count', 'Variance');
    if (colCostPrice) headers.push('Unit Cost (KES)');
    if (colSellingPrice) headers.push('Unit Price (KES)');
    if (colValuation) headers.push('Total Cost (KES)', 'Total Retail (KES)');
    if (colMargins) headers.push('Gross Margin (KES)', 'Margin %');
    headers.push('Status');
    csvRows.push(headers.map(escapeCsv).join(','));

    filteredProducts.forEach((p, idx) => {
      const row: any[] = [idx + 1];
      if (colSku) row.push(p.sku);
      row.push(p.name, p.category_name || 'General', p.unit, p.stock_quantity);
      if (colPhysicalCount) row.push('', '');
      if (colCostPrice) row.push(p.cost_price.toFixed(2));
      if (colSellingPrice) row.push(p.selling_price.toFixed(2));
      if (colValuation) {
        row.push((p.stock_quantity * p.cost_price).toFixed(2));
        row.push((p.stock_quantity * p.selling_price).toFixed(2));
      }
      if (colMargins) {
        const marginKES = Math.max(0, p.selling_price - p.cost_price);
        const marginPct = p.selling_price > 0 ? (marginKES / p.selling_price) * 100 : 0;
        row.push((marginKES * p.stock_quantity).toFixed(2));
        row.push(`${marginPct.toFixed(1)}%`);
      }
      const status = p.stock_quantity <= 0 ? 'Out of Stock' : p.stock_quantity <= p.minimum_stock ? 'Low Stock' : 'Optimal';
      row.push(status);
      csvRows.push(row.map(escapeCsv).join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${auditRefId}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  };

  return (
    <div
      id="modal-stock-audit-container"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 text-[#F8FAFC] antialiased select-none"
    >
      <div className="w-full max-w-5xl max-h-[94vh] bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-[#141F36] border-b border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/25Sep2424_Simon_Pro_Upload__6279a8d4.jpg"
              alt="Bright Cyber Global Tech"
              className="w-10 h-10 rounded-lg object-contain bg-[#0B1229] border border-blue-500/30 shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight uppercase font-serif-luxury">
                  Stock List & Audit Generator
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  A4 Portrait Document
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Customizable presets, instant PDF download, Excel workbook, and manager sign-off certification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher tabs */}
            <div className="flex bg-[#0B0F19] p-1 rounded-lg border border-[#1E293B]">
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === 'preview'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Portrait A4 Preview ({filteredProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('config')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === 'config'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Custom Options
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar bg-[#0B0F19]">
          {activeView === 'config' ? (
            /* CONFIGURATION VIEW */
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Presets Selection */}
              <div>
                <label className="text-xs font-bold text-[#C5A059] uppercase tracking-wider block mb-2">
                  1. Choose Report Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: 'valuation' as AuditPreset,
                      title: 'Full Valuation Audit',
                      desc: 'Cost bases, retail prices, margins, total capital',
                    },
                    {
                      id: 'stocktake' as AuditPreset,
                      title: 'Stocktake Counting Sheet',
                      desc: 'Physical count lines [_____] & variance boxes',
                    },
                    {
                      id: 'catalogue' as AuditPreset,
                      title: 'Retail Price Catalogue',
                      desc: 'Public price directory, conceals wholesale costs',
                    },
                    {
                      id: 'reorder' as AuditPreset,
                      title: 'Reorder & Low Stock List',
                      desc: 'Procurement list filtered to critical reorder points',
                    },
                  ].map((p) => {
                    const isSelected = preset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPresetConfig(p.id)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#2563EB]/15 border-[#2563EB] ring-1 ring-[#2563EB]'
                            : 'bg-[#141F36] border-[#1E293B] hover:border-[#334155]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                            {p.title}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] leading-snug">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters Section */}
              <div className="p-4 bg-[#141F36] border border-[#1E293B] rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C5A059]">
                  <Filter className="w-3.5 h-3.5" /> 2. Scope & Department Filters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Category / Department</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-lg text-xs text-white"
                    >
                      <option value="all">All Categories ({products.length} items)</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c} ({products.filter((p) => (p.category_name || 'General') === c).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Stock Level Status</label>
                    <select
                      value={stockStatusFilter}
                      onChange={(e) => setStockStatusFilter(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-lg text-xs text-white"
                    >
                      <option value="all">All Stock Statuses</option>
                      <option value="in_stock">In Stock (&gt; Min Threshold)</option>
                      <option value="low_stock">Low Stock (≤ Min Threshold)</option>
                      <option value="depleted">Depleted (0 Units)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Search Keywords</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by product name, SKU..."
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-lg text-xs text-white placeholder-[#64748B]"
                    />
                  </div>
                </div>
              </div>

              {/* Column Toggles */}
              <div className="p-4 bg-[#141F36] border border-[#1E293B] rounded-xl space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#C5A059]">
                  3. Toggleable Columns (A4 Portrait Layout)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colCostPrice}
                      onChange={(e) => setColCostPrice(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>Unit Cost Price</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colSellingPrice}
                      onChange={(e) => setColSellingPrice(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>Unit Selling Price</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colValuation}
                      onChange={(e) => setColValuation(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>Total Valuation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colMargins}
                      onChange={(e) => setColMargins(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>Gross Margins</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colSku}
                      onChange={(e) => setColSku(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>SKU / Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colPhysicalCount}
                      onChange={(e) => setColPhysicalCount(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>Physical Count Box</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colSignOff}
                      onChange={(e) => setColSignOff(e.target.checked)}
                      className="rounded border-[#334155] text-[#2563EB] focus:ring-0"
                    />
                    <span>Manager Stamp Block</span>
                  </label>
                </div>
              </div>

              {/* Header & Verification Metadata */}
              <div className="p-4 bg-[#141F36] border border-[#1E293B] rounded-xl space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#C5A059]">
                  4. Report Header & Certification Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Auditor / Authorizing Official</label>
                    <input
                      type="text"
                      value={auditorName}
                      onChange={(e) => setAuditorName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-[#94A3B8]">Audit Reference Number</label>
                      <button
                        type="button"
                        onClick={() => setAuditRefId(generateNewAuditId())}
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Regenerate ID
                      </button>
                    </div>
                    <input
                      type="text"
                      value={auditRefId}
                      onChange={(e) => setAuditRefId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-lg text-xs font-mono text-[#C5A059]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Audit Notes / Directives</label>
                    <textarea
                      rows={2}
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-lg text-xs text-white custom-scrollbar"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Eye className="w-4 h-4" /> View Portrait Preview
                </button>
              </div>
            </div>
          ) : (
            /* PRINT-READY A4 PORTRAIT PREVIEW */
            <div className="space-y-4">
              {/* Quick Action Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141F36] p-3 rounded-xl border border-[#1E293B]">
                <div className="text-xs text-[#94A3B8]">
                  Portrait A4 Sheet: <span className="font-bold text-white">{filteredProducts.length}</span> items • Click{' '}
                  <span className="text-[#C5A059] font-semibold">Download PDF</span> to save the document.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('config')}
                    className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Configure
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCustomExcel}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Download Excel Workbook (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCustomCsv}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Download Comma Separated (.csv)"
                  >
                    <FileText className="w-3.5 h-3.5" /> CSV (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Print to Physical Printer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    type="button"
                    id="btn-download-pdf-doc"
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#B38F48] text-black rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Downloading PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-black" />
                        <span>Download PDF Document (.pdf)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* The printable A4 Portrait sheet container */}
              <div className="flex justify-center bg-[#070A10] p-2 sm:p-4 rounded-xl overflow-x-auto">
                <div
                  id="printable-stock-audit"
                  className="bg-white text-gray-950 p-6 sm:p-7 rounded-lg shadow-2xl font-sans text-xs border border-gray-200 w-full max-w-[794px]"
                  style={{ minWidth: '680px' }}
                >
                  {/* Portrait Header Banner */}
                  <div className="flex items-start justify-between pb-4 border-b-2 border-gray-900 gap-4">
                    {/* Logo and Brand */}
                    <div className="flex items-center gap-3">
                      <img
                        src="/assets/aistudio/25Sep2424_Simon_Pro_Upload__6279a8d4.jpg"
                        alt="Bright Cyber Global Tech"
                        crossOrigin="anonymous"
                        className="w-14 h-14 rounded-lg object-contain bg-[#0B1229] border border-blue-900 p-0.5 shrink-0"
                      />
                      <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-gray-950 font-serif-luxury leading-tight">
                          BRIGHT CYBER & ICT CENTRE
                        </h1>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                          Bright Cyber Global Tech • Retail Point of Sale System
                        </div>
                        <div className="text-[9.5px] text-gray-600 mt-0.5 leading-snug">
                          {settings?.address || 'Biashara Street, Nairobi, Kenya'} • Tel: {settings?.phone || '+254 712 345 678'}
                          <br />
                          Email: {settings?.email || 'info@brightcyber.co.ke'}
                        </div>
                      </div>
                    </div>

                    {/* Audit Metadata Box */}
                    <div className="text-right text-[10px] space-y-0.5 shrink-0">
                      <div className="inline-block px-2 py-0.5 bg-gray-950 text-white font-bold text-[9px] uppercase tracking-wider rounded mb-1">
                        {preset === 'valuation'
                          ? 'Official Stock Valuation'
                          : preset === 'stocktake'
                          ? 'Stocktake Counting Sheet'
                          : preset === 'catalogue'
                          ? 'Retail Price Directory'
                          : 'Reorder Procurement List'}
                      </div>
                      <div>
                        <span className="text-gray-500">Ref ID: </span>
                        <strong className="font-mono text-gray-950 font-bold">{auditRefId}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Date: </span>
                        <span className="font-semibold text-gray-800">{currentDateFormatted}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Auditor: </span>
                        <strong className="text-gray-900">{auditorName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Audit Directives / Notes */}
                  {auditNotes && (
                    <div className="my-2.5 p-2 bg-gray-50 border-l-4 border-blue-600 rounded-r text-[10px] text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-900">Audit Directives: </span>
                      {auditNotes}
                    </div>
                  )}

                  {/* Portrait KPI Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Total SKUs</div>
                      <div className="text-sm font-bold text-gray-950 mt-0.5">{totalItemsCount} Products</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Physical Stock</div>
                      <div className="text-sm font-bold text-gray-950 mt-0.5 font-mono">{totalUnits} Units</div>
                    </div>
                    {colCostPrice && (
                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Cost Valuation</div>
                        <div className="text-sm font-bold text-gray-950 mt-0.5 font-mono">{formatKsh(totalCostValuation)}</div>
                      </div>
                    )}
                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Retail Valuation</div>
                      <div className="text-sm font-bold text-blue-700 mt-0.5 font-mono">{formatKsh(totalRetailValuation)}</div>
                    </div>
                  </div>

                  {/* Tabular Data - Portrait optimized layout */}
                  <table className="w-full text-left text-[10px] border-collapse mt-2">
                    <thead>
                      <tr className="bg-gray-100 text-gray-950 uppercase text-[9px] font-black tracking-wider border-y-2 border-gray-400">
                        <th className="py-1.5 px-1.5 w-6">#</th>
                        {colSku && <th className="py-1.5 px-1.5 w-20">SKU</th>}
                        <th className="py-1.5 px-1.5">Description</th>
                        <th className="py-1.5 px-1.5 w-20">Category</th>
                        <th className="py-1.5 px-1.5 text-center w-8">Unit</th>
                        <th className="py-1.5 px-1.5 text-right w-12">Qty</th>
                        {colPhysicalCount && (
                          <>
                            <th className="py-1.5 px-1.5 text-center bg-yellow-50 text-yellow-950 w-24 border-x border-gray-300">
                              Count [ ___ ]
                            </th>
                            <th className="py-1.5 px-1.5 text-center bg-yellow-50 text-yellow-950 w-16">
                              Diff [±]
                            </th>
                          </>
                        )}
                        {colCostPrice && <th className="py-1.5 px-1.5 text-right w-16">Cost</th>}
                        {colSellingPrice && <th className="py-1.5 px-1.5 text-right w-16">Price</th>}
                        {colValuation && (
                          <th className="py-1.5 px-1.5 text-right w-20">Total (KES)</th>
                        )}
                        {colMargins && <th className="py-1.5 px-1.5 text-right w-16">Margin</th>}
                        <th className="py-1.5 px-1.5 text-center w-14">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map((p, idx) => {
                        const costVal = p.stock_quantity * p.cost_price;
                        const retailVal = p.stock_quantity * p.selling_price;
                        const marginKES = Math.max(0, p.selling_price - p.cost_price);
                        const isLow = p.stock_quantity <= p.minimum_stock && p.stock_quantity > 0;
                        const isOut = p.stock_quantity <= 0;

                        return (
                          <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                            <td className="py-1 px-1.5 text-gray-500 font-mono text-[9px]">{idx + 1}</td>
                            {colSku && (
                              <td className="py-1 px-1.5 font-mono text-[9px] text-gray-700 whitespace-nowrap">
                                {p.sku}
                              </td>
                            )}
                            <td className="py-1 px-1.5 font-semibold text-gray-950">{p.name}</td>
                            <td className="py-1 px-1.5 text-gray-600 text-[9px] truncate max-w-[90px]">
                              {p.category_name || 'General'}
                            </td>
                            <td className="py-1 px-1.5 text-center text-gray-600 text-[9px]">{p.unit}</td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold text-gray-950">
                              {p.stock_quantity}
                            </td>
                            {colPhysicalCount && (
                              <>
                                <td className="py-1 px-1.5 text-center bg-yellow-50/60 border-x border-gray-300 font-mono text-gray-400">
                                  [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                                </td>
                                <td className="py-1 px-1.5 text-center bg-yellow-50/60 font-mono text-gray-400">
                                  [ &nbsp;&nbsp;&nbsp; ]
                                </td>
                              </>
                            )}
                            {colCostPrice && (
                              <td className="py-1 px-1.5 text-right font-mono text-gray-700">{formatKsh(p.cost_price)}</td>
                            )}
                            {colSellingPrice && (
                              <td className="py-1 px-1.5 text-right font-mono font-semibold text-gray-950">
                                {formatKsh(p.selling_price)}
                              </td>
                            )}
                            {colValuation && (
                              <td className="py-1 px-1.5 text-right font-mono font-bold text-blue-900">
                                {formatKsh(retailVal)}
                              </td>
                            )}
                            {colMargins && (
                              <td className="py-1 px-1.5 text-right font-mono text-emerald-800">
                                +{formatKsh(marginKES * p.stock_quantity)}
                              </td>
                            )}
                            <td className="py-1 px-1.5 text-center whitespace-nowrap">
                              {isOut ? (
                                <span className="text-[8.5px] font-bold text-rose-700 uppercase">Depleted</span>
                              ) : isLow ? (
                                <span className="text-[8.5px] font-bold text-amber-700 uppercase">Low</span>
                              ) : (
                                <span className="text-[8.5px] font-semibold text-gray-600">Optimal</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Totals Footer Row */}
                    <tfoot>
                      <tr className="bg-gray-200/90 text-gray-950 font-black border-t-2 border-gray-400 text-[9.5px]">
                        <td colSpan={colSku ? 3 : 2} className="py-2 px-1.5 uppercase tracking-wider text-right">
                          Total ({totalItemsCount} Items):
                        </td>
                        <td colSpan={2} className="py-2 px-1.5 text-center">—</td>
                        <td className="py-2 px-1.5 text-right font-mono font-bold">{totalUnits}</td>
                        {colPhysicalCount && (
                          <>
                            <td className="py-2 px-1.5 text-center bg-yellow-100/50 border-x border-gray-300 font-mono">
                              Count: [ ___ ]
                            </td>
                            <td className="py-2 px-1.5 text-center bg-yellow-100/50 font-mono">Net: [ ___ ]</td>
                          </>
                        )}
                        {colCostPrice && <td className="py-2 px-1.5 text-right font-mono">—</td>}
                        {colSellingPrice && <td className="py-2 px-1.5 text-right font-mono">—</td>}
                        {colValuation && (
                          <td className="py-2 px-1.5 text-right font-mono font-bold text-blue-950">
                            {formatKsh(totalRetailValuation)}
                          </td>
                        )}
                        {colMargins && (
                          <td className="py-2 px-1.5 text-right font-mono font-bold text-emerald-900">
                            {formatKsh(totalPotentialProfit)}
                          </td>
                        )}
                        <td className="py-2 px-1.5 text-center">—</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Manager Sign-Off & Official Stamp Block (Portrait Layout) */}
                  {colSignOff && (
                    <div className="mt-6 pt-4 border-t-2 border-gray-300 grid grid-cols-3 gap-4 text-[9.5px] text-gray-700">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 uppercase">Stock Auditor:</div>
                        <div className="pt-6 border-b border-gray-400 font-semibold text-gray-950">{auditorName}</div>
                        <div className="text-[8.5px] text-gray-500">Signature & Verification</div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 uppercase">Operations Manager:</div>
                        <div className="pt-6 border-b border-gray-400 font-semibold text-gray-950">
                          Authorized Approval
                        </div>
                        <div className="text-[8.5px] text-gray-500">Clearance & Sign-off</div>
                      </div>

                      <div className="p-2 border-2 border-dashed border-gray-400 rounded flex flex-col items-center justify-center text-center min-h-[70px]">
                        <div className="font-bold uppercase tracking-wider text-gray-400 text-[8.5px]">
                          Official Stamp
                        </div>
                        <div className="text-[8px] text-gray-400">
                          Bright Cyber & ICT Centre
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 bg-[#141F36] border-t border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#94A3B8]">
            Bright Cyber Global Tech • Ref:{' '}
            <span className="font-mono text-[#C5A059]">{auditRefId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-black text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-black" />
                  <span>Download PDF Document (.pdf)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
