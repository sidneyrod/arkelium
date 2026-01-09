import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCsv } from '@/utils/pdfGenerator';
import { WorkEarningsPeriod, GlobalSummary } from '@/hooks/useWorkEarnings';
import { useCompanyStore } from '@/stores/companyStore';
import html2pdf from 'html2pdf.js';

interface ExportReportButtonProps {
  period: WorkEarningsPeriod;
  globalSummary: GlobalSummary;
  getExportData: () => Promise<any[]>;
}

export function ExportReportButton({
  period,
  globalSummary,
  getExportData,
}: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { profile } = useCompanyStore();

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const data = await getExportData();
      
      if (data.length === 0) {
        toast.error('No data to export for the selected period');
        return;
      }

      const filename = `work-time-tracking-report-${period.startDate}-to-${period.endDate}`;
      exportToCsv(data, filename);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);

    let container: HTMLDivElement | null = null;

    try {
      const data = await getExportData();

      if (data.length === 0) {
        toast.error('No data to export for the selected period');
        return;
      }

      const companyName = profile?.companyName || 'Company';
      const safeCompanyName = safeFilenamePart(companyName);
      const filename = `${safeCompanyName}-work-time-tracking-${period.startDate}-to-${period.endDate}.pdf`;

      // Generate content HTML (without full document structure for html2pdf)
      const contentHtml = generatePdfContentHtml(data, period, globalSummary, companyName);

      // Create container with content (sized to fit within A4 landscape margins)
      container = createWorkTimeTrackingPdfContainer(contentHtml);
      document.body.appendChild(container);

      const windowWidth = container.scrollWidth;

      await html2pdf()
        .set(getWorkTimeTrackingPdfOptions({ filename, windowWidth }))
        .from(container)
        .save();

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      if (container?.parentNode) container.parentNode.removeChild(container);
      setIsExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    setIsExporting(true);

    let container: HTMLDivElement | null = null;

    try {
      const data = await getExportData();

      if (data.length === 0) {
        toast.error('No data to export for the selected period');
        return;
      }

      const companyName = profile?.companyName || 'Company';
      const safeCompanyName = safeFilenamePart(companyName);
      const filename = `${safeCompanyName}-work-time-tracking-${period.startDate}-to-${period.endDate}.pdf`;

      const contentHtml = generatePdfContentHtml(data, period, globalSummary, companyName);

      container = createWorkTimeTrackingPdfContainer(contentHtml);
      document.body.appendChild(container);

      const windowWidth = container.scrollWidth;

      const worker = html2pdf().set(getWorkTimeTrackingPdfOptions({ filename, windowWidth })).from(container);

      const out = await worker.outputPdf('bloburl');
      if (typeof out === 'string') {
        window.open(out, '_blank', 'noopener,noreferrer');
      } else if (out instanceof Blob) {
        const url = URL.createObjectURL(out);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }

      toast.success('PDF opened in a new tab for printing');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to generate print preview');
    } finally {
      if (container?.parentNode) container.parentNode.removeChild(container);
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPdf}>
          <FileText className="h-4 w-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintPdf}>
          <Printer className="h-4 w-4 mr-2" />
          Print PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCsv}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const A4_LANDSCAPE_WIDTH_MM = 297;
const WORK_TIME_PDF_MARGIN_MM = 8;
const WORK_TIME_PDF_CONTAINER_WIDTH_MM = A4_LANDSCAPE_WIDTH_MM - WORK_TIME_PDF_MARGIN_MM * 2;

function safeFilenamePart(value: string): string {
  const normalized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const safe = normalized
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();

  return safe || 'company';
}

function createWorkTimeTrackingPdfContainer(contentHtml: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = contentHtml;

  // Fit within A4 landscape after margins to prevent right-side clipping.
  container.style.width = `${WORK_TIME_PDF_CONTAINER_WIDTH_MM}mm`;
  container.style.padding = '6mm';
  container.style.boxSizing = 'border-box';

  container.style.fontFamily = 'Segoe UI, system-ui, sans-serif';
  container.style.fontSize = '10px';
  container.style.color = '#1a1a1a';
  container.style.lineHeight = '1.4';
  container.style.background = 'white';
  container.style.overflow = 'visible';

  return container;
}

function getWorkTimeTrackingPdfOptions({
  filename,
  windowWidth,
}: {
  filename: string;
  windowWidth: number;
}) {
  return {
    margin: [WORK_TIME_PDF_MARGIN_MM, WORK_TIME_PDF_MARGIN_MM, WORK_TIME_PDF_MARGIN_MM, WORK_TIME_PDF_MARGIN_MM] as [number, number, number, number],
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth,
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] },
  };
}

// Generate content HTML without full document structure (for html2pdf)
function generatePdfContentHtml(
  data: any[],
  period: WorkEarningsPeriod,
  summary: GlobalSummary,
  companyName: string
): string {
  const rows = data.map(row => `
    <tr>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row.Date}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row.Employee}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row.Role}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row.Client}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row['Job ID']}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">${row['Hours Worked']}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">${row['Gross Service Amount']}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row['Payment Method']}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">${row['Cash Kept by Employee']}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">${row['Cash Delivered to Office']}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${row.Status}</td>
    </tr>
  `).join('');

  return `
    <div style="border-bottom: 2px solid #1a3d2e; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="font-size: 18px; font-weight: 600; color: #1a3d2e;">${companyName}</div>
        <div style="font-size: 14px; font-weight: 500; margin-top: 4px;">Staff Work & Time Report</div>
      </div>
      <div style="font-size: 11px; color: #666;">
        Period: ${period.startDate} to ${period.endDate}
      </div>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
      <div style="flex: 1; background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
        <div style="font-size: 9px; color: #666; text-transform: uppercase;">Jobs Completed</div>
        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">${summary.totalJobsCompleted}</div>
      </div>
      <div style="flex: 1; background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
        <div style="font-size: 9px; color: #666; text-transform: uppercase;">Hours Worked</div>
        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">${summary.totalHoursWorked.toFixed(1)}h</div>
      </div>
      <div style="flex: 1; background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
        <div style="font-size: 9px; color: #666; text-transform: uppercase;">Gross Service Revenue</div>
        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">$${summary.totalGrossServiceRevenue.toLocaleString()}</div>
      </div>
      <div style="flex: 1; background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
        <div style="font-size: 9px; color: #666; text-transform: uppercase;">Total Cash Collected</div>
        <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">$${summary.totalCashCollected.toLocaleString()}</div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
      <thead>
        <tr>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Date</th>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Employee</th>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Role</th>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Client</th>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Job ID</th>
          <th style="background: #f3f4f6; text-align: right; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Hours</th>
          <th style="background: #f3f4f6; text-align: right; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Amount</th>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Payment</th>
          <th style="background: #f3f4f6; text-align: right; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Cash Kept</th>
          <th style="background: #f3f4f6; text-align: right; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Cash Delivered</th>
          <th style="background: #f3f4f6; text-align: left; padding: 8px 6px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; padding: 10px; font-size: 9px; color: #0c4a6e; margin-bottom: 12px;">
        <strong>Notes:</strong>
        <ul style="margin: 8px 0 0 16px; padding: 0;">
          <li style="margin-bottom: 6px;"><strong>Cash Kept by Employee:</strong> When a service is paid in cash, the staff member may choose to retain the amount (to be deducted from their next payroll). This column only shows amounts that have been <u>explicitly approved by an Administrator</u>. Unapproved cash retentions are not included in this report.</li>
          <li style="margin-bottom: 6px;"><strong>Cash Delivered to Office:</strong> Cash payments collected by the employee and physically delivered to the company office, confirmed by admin.</li>
        </ul>
      </div>
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 10px; font-size: 9px; color: #92400e;">
        <strong>Important Notice:</strong> This report is operational and financial only. 
        Payroll calculation and tax compliance must be handled externally by the accountant. 
        This system does not calculate salaries, deductions, CPP, EI, or any payroll amounts.
      </div>
      <div style="font-size: 9px; color: #9ca3af; text-align: right; margin-top: 8px;">
        Generated on ${new Date().toLocaleString()}
      </div>
    </div>
  `;
}

// Generate full HTML document (for print window)
function generateWorkTimeTrackingReportHtml(
  data: any[],
  period: WorkEarningsPeriod,
  summary: GlobalSummary,
  companyName: string
): string {
  const rows = data.map(row => `
    <tr>
      <td>${row.Date}</td>
      <td>${row.Cleaner}</td>
      <td>${row.Client}</td>
      <td>${row['Job ID']}</td>
      <td style="text-align: right;">${row['Hours Worked']}</td>
      <td style="text-align: right;">${row['Gross Service Amount']}</td>
      <td>${row['Payment Method']}</td>
      <td style="text-align: right;">${row['Cash Kept by Cleaner']}</td>
      <td style="text-align: right;">${row['Cash Delivered to Office']}</td>
      <td>${row.Status}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Work & Time Tracking Report - ${period.startDate} to ${period.endDate}</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', system-ui, sans-serif; 
          font-size: 10px; 
          color: #1a1a1a;
          line-height: 1.4;
          margin: 0;
          padding: 15px;
          background: white;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start;
          border-bottom: 2px solid #1a3d2e; 
          padding-bottom: 12px; 
          margin-bottom: 16px; 
        }
        .company-name { font-size: 18px; font-weight: 600; color: #1a3d2e; }
        .report-title { font-size: 14px; font-weight: 500; margin-top: 4px; }
        .period { font-size: 11px; color: #666; }
        .summary-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .summary-card {
          flex: 1;
          background: #f8f9fb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .summary-label { font-size: 9px; color: #666; text-transform: uppercase; }
        .summary-value { font-size: 16px; font-weight: 600; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { 
          background: #f3f4f6; 
          text-align: left; 
          padding: 8px 6px; 
          font-weight: 600;
          border-bottom: 1px solid #d1d5db;
          text-transform: uppercase;
          font-size: 8px;
          letter-spacing: 0.5px;
        }
        td { 
          padding: 6px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        .footer { 
          margin-top: 24px; 
          padding-top: 12px; 
          border-top: 1px solid #e5e7eb;
        }
        .notes-section {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 4px;
          padding: 10px;
          font-size: 9px;
          color: #0c4a6e;
          margin-bottom: 12px;
        }
        .notes-section li {
          margin-bottom: 6px;
        }
        .disclaimer {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 4px;
          padding: 10px;
          font-size: 9px;
          color: #92400e;
        }
        .generated-at {
          font-size: 9px;
          color: #9ca3af;
          text-align: right;
          margin-top: 8px;
        }
        @media print {
          @page { size: A4 landscape; margin: 1.5cm; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">${companyName}</div>
          <div class="report-title">Work & Time Tracking Report</div>
        </div>
        <div class="period">
          Period: ${period.startDate} to ${period.endDate}
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Jobs Completed</div>
          <div class="summary-value">${summary.totalJobsCompleted}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Hours Worked</div>
          <div class="summary-value">${summary.totalHoursWorked.toFixed(1)}h</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Gross Service Revenue</div>
          <div class="summary-value">$${summary.totalGrossServiceRevenue.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Cash Collected</div>
          <div class="summary-value">$${summary.totalCashCollected.toLocaleString()}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Cleaner</th>
            <th>Client</th>
            <th>Job ID</th>
            <th style="text-align: right;">Hours</th>
            <th style="text-align: right;">Amount</th>
            <th>Payment</th>
            <th style="text-align: right;">Cash Kept</th>
            <th style="text-align: right;">Cash Delivered</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        <div class="notes-section">
          <strong>Notes:</strong>
          <ul style="margin: 8px 0 0 16px; padding: 0;">
            <li><strong>Cash Kept by Cleaner:</strong> When a service is paid in cash, the cleaner may choose to retain the amount (to be deducted from their next payroll). This column only shows amounts that have been <u>explicitly approved by an Administrator</u>. Unapproved cash retentions are not included in this report.</li>
            <li><strong>Cash Delivered to Office:</strong> Cash payments collected by the cleaner and physically delivered to the company office, confirmed by admin.</li>
          </ul>
        </div>
        <div class="disclaimer">
          <strong>Important Notice:</strong> This report is operational and financial only. 
          Payroll calculation and tax compliance must be handled externally by the accountant. 
          This system does not calculate salaries, deductions, CPP, EI, or any payroll amounts.
        </div>
        <div class="generated-at">
          Generated on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
}
