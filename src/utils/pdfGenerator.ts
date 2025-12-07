/**
 * PDF Generation Utilities for Multi-Tenant Cleaning Management Platform
 * 
 * CRITICAL MULTI-TENANT BRANDING RULE:
 * - All generated documents (Contracts, Invoices, Reports) MUST use CLIENT COMPANY branding
 * - The platform owner (ARKELIUM) MUST NEVER appear on client documents
 * - Branding (logo, colors, company name) is dynamically loaded from Company Branding table
 * - Logo appears at TOP HEADER and as WATERMARK in background
 * - If no company logo exists, use neutral placeholder (never fallback to ARKELIUM)
 */

import { CompanyProfile, CompanyBranding } from '@/stores/companyStore';

export interface ContractPdfData {
  contractId: string;
  clientName: string;
  clientAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  contractType: 'recurring' | 'one-time';
  startDate: string;
  endDate?: string;
  hoursPerWeek: number;
  hourlyRate: number;
  billingFrequency: string;
  cleaningDays: string[];
  timeWindow: string;
  serviceLocation: string;
  cleaningScope: string;
  specialNotes?: string;
  totalValue: number;
}

export interface EstimatePdfData {
  estimateId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceType: string;
  frequency: string;
  squareFootage: number;
  roomDetails: string;
  extras: string[];
  totalAmount: number;
  validUntil: string;
}

export interface PayrollReportData {
  periodStart: string;
  periodEnd: string;
  province: string;
  employees: {
    name: string;
    regularHours: number;
    overtimeHours: number;
    grossPay: number;
    netPay: number;
  }[];
  totals: {
    hours: number;
    gross: number;
    net: number;
  };
}

/**
 * Generate common PDF styles with company branding
 * Uses COMPANY branding (not platform branding)
 */
const getCommonStyles = (branding: CompanyBranding) => `
  @page { size: A4; margin: 2cm; }
  body { 
    font-family: 'Outfit', 'Segoe UI', sans-serif; 
    color: #1a1a1a; 
    line-height: 1.6; 
    position: relative;
  }
  .header { 
    text-align: center; 
    margin-bottom: 40px; 
    position: relative; 
  }
  .watermark { 
    position: fixed; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%);
    opacity: 0.06;
    z-index: -1;
    pointer-events: none;
  }
  .watermark img {
    max-width: 400px;
    max-height: 400px;
    object-fit: contain;
  }
  .watermark-text {
    font-size: 100px;
    font-weight: bold;
    color: ${branding.primaryColor || '#1a3d2e'};
    transform: rotate(-30deg);
    opacity: 0.04;
  }
  .logo { 
    max-width: 180px; 
    max-height: 80px;
    margin-bottom: 16px; 
    object-fit: contain;
  }
  .company-name { 
    font-size: 24px; 
    font-weight: 600; 
    color: ${branding.primaryColor || '#1a3d2e'}; 
  }
  .company-info { 
    font-size: 12px; 
    color: #666; 
    margin-top: 8px; 
  }
  .title { 
    font-size: 20px; 
    font-weight: 600; 
    margin: 40px 0 30px; 
    border-bottom: 2px solid ${branding.primaryColor || '#1a3d2e'}; 
    padding-bottom: 10px; 
  }
  .section { margin-bottom: 25px; }
  .section-title { 
    font-size: 14px; 
    font-weight: 600; 
    color: ${branding.primaryColor || '#1a3d2e'}; 
    margin-bottom: 10px; 
  }
  .field { display: flex; margin-bottom: 8px; }
  .field-label { width: 150px; font-weight: 500; color: #555; }
  .field-value { flex: 1; }
  .total-box { 
    background: linear-gradient(135deg, ${branding.primaryColor || '#1a3d2e'}15, ${branding.primaryColor || '#1a3d2e'}08);
    border: 1px solid ${branding.primaryColor || '#1a3d2e'}30;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    margin: 30px 0;
  }
  .total-label { font-size: 12px; color: #666; }
  .total-value { font-size: 32px; font-weight: 700; color: ${branding.primaryColor || '#1a3d2e'}; }
  .terms { font-size: 11px; color: #666; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
  .signature-section { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; }
  .signature-line { border-bottom: 1px solid #333; margin-bottom: 8px; height: 50px; }
  .signature-label { font-size: 12px; color: #666; }
  .footer { 
    position: fixed; 
    bottom: 2cm; 
    left: 2cm; 
    right: 2cm; 
    text-align: center; 
    font-size: 10px; 
    color: #999; 
  }
`;

/**
 * Generate watermark HTML based on company branding
 * Uses company logo if available, otherwise neutral text watermark
 * NEVER uses ARKELIUM branding
 */
const getWatermarkHtml = (company: CompanyProfile, branding: CompanyBranding) => {
  if (branding.logoUrl) {
    return `
      <div class="watermark">
        <img src="${branding.logoUrl}" alt="" />
      </div>
    `;
  }
  // Neutral watermark with company name (no ARKELIUM branding)
  return `
    <div class="watermark">
      <div class="watermark-text">${company.companyName || ''}</div>
    </div>
  `;
};

/**
 * Generate header HTML with company logo and info
 * Uses CLIENT COMPANY branding (from company settings)
 */
const getHeaderHtml = (company: CompanyProfile, branding: CompanyBranding) => `
  <div class="header">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" class="logo" alt="${company.companyName}" />` : ''}
    <div class="company-name">${company.companyName || 'Company Name'}</div>
    <div class="company-info">
      ${company.address ? `${company.address}, ` : ''}${company.city || ''}, ${company.province || ''} ${company.postalCode || ''}<br>
      ${company.phone ? `${company.phone} | ` : ''}${company.email || ''}
    </div>
  </div>
`;

/**
 * Generate a contract PDF document
 * Uses CLIENT COMPANY branding - NEVER ARKELIUM
 */
export const generateContractPdf = (
  data: ContractPdfData,
  company: CompanyProfile,
  branding: CompanyBranding,
  language: 'en' | 'fr' = 'en'
): string => {
  const labels = language === 'fr' ? {
    title: 'CONTRAT DE SERVICE DE NETTOYAGE',
    client: 'Client',
    address: 'Adresse',
    contractType: 'Type de contrat',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    schedule: 'Horaire',
    rate: 'Taux',
    total: 'Total estimé',
    terms: 'Termes et conditions',
    signature: 'Signature',
  } : {
    title: 'CLEANING SERVICE CONTRACT',
    client: 'Client',
    address: 'Address',
    contractType: 'Contract Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    schedule: 'Schedule',
    rate: 'Rate',
    total: 'Estimated Total',
    terms: 'Terms and Conditions',
    signature: 'Signature',
  };

  const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <style>${getCommonStyles(branding)}</style>
</head>
<body>
  ${getWatermarkHtml(company, branding)}
  ${getHeaderHtml(company, branding)}
  
  <h1 class="title">${labels.title}</h1>
  
  <div class="section">
    <div class="section-title">${labels.client} Information</div>
    <div class="field">
      <span class="field-label">${labels.client}:</span>
      <span class="field-value">${data.clientName}</span>
    </div>
    <div class="field">
      <span class="field-label">${labels.address}:</span>
      <span class="field-value">${data.clientAddress}</span>
    </div>
    ${data.clientEmail ? `<div class="field"><span class="field-label">Email:</span><span class="field-value">${data.clientEmail}</span></div>` : ''}
    ${data.clientPhone ? `<div class="field"><span class="field-label">Phone:</span><span class="field-value">${data.clientPhone}</span></div>` : ''}
  </div>
  
  <div class="section">
    <div class="section-title">Contract Details</div>
    <div class="field">
      <span class="field-label">${labels.contractType}:</span>
      <span class="field-value">${data.contractType === 'recurring' ? 'Recurring' : 'One-time'}</span>
    </div>
    <div class="field">
      <span class="field-label">${labels.startDate}:</span>
      <span class="field-value">${data.startDate}</span>
    </div>
    ${data.endDate ? `<div class="field"><span class="field-label">${labels.endDate}:</span><span class="field-value">${data.endDate}</span></div>` : ''}
    <div class="field">
      <span class="field-label">${labels.schedule}:</span>
      <span class="field-value">${data.cleaningDays.join(', ')} (${data.timeWindow})</span>
    </div>
    <div class="field">
      <span class="field-label">Hours/Week:</span>
      <span class="field-value">${data.hoursPerWeek} hours</span>
    </div>
    <div class="field">
      <span class="field-label">${labels.rate}:</span>
      <span class="field-value">$${data.hourlyRate}/hour</span>
    </div>
    <div class="field">
      <span class="field-label">Billing:</span>
      <span class="field-value">${data.billingFrequency}</span>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Service Details</div>
    <div class="field">
      <span class="field-label">Location:</span>
      <span class="field-value">${data.serviceLocation}</span>
    </div>
    <div class="field">
      <span class="field-label">Scope:</span>
      <span class="field-value">${data.cleaningScope}</span>
    </div>
    ${data.specialNotes ? `<div class="field"><span class="field-label">Notes:</span><span class="field-value">${data.specialNotes}</span></div>` : ''}
  </div>
  
  <div class="total-box">
    <div class="total-label">${labels.total}</div>
    <div class="total-value">$${data.totalValue.toLocaleString()}</div>
    <div class="total-label">per ${data.billingFrequency.toLowerCase()}</div>
  </div>
  
  <div class="terms">
    <strong>${labels.terms}:</strong><br>
    1. Services will be performed as described above during agreed hours.<br>
    2. Payment is due within 30 days of invoice date.<br>
    3. Either party may terminate with 14 days written notice.<br>
    4. ${company.companyName} maintains liability insurance.<br>
    5. Client agrees to provide access and necessary utilities.
  </div>
  
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">${company.companyName} Representative</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">${labels.client} ${labels.signature}</div>
    </div>
  </div>
  
  <div class="footer">
    Contract #${data.contractId} | Generated on ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
  `;

  return html;
};

/**
 * Generate an estimate PDF document
 * Uses CLIENT COMPANY branding - NEVER ARKELIUM
 */
export const generateEstimatePdf = (
  data: EstimatePdfData,
  company: CompanyProfile,
  branding: CompanyBranding,
  language: 'en' | 'fr' = 'en'
): string => {
  const labels = language === 'fr' ? {
    title: 'DEVIS DE SERVICE',
    validUntil: 'Valide jusqu\'au',
  } : {
    title: 'SERVICE ESTIMATE',
    validUntil: 'Valid until',
  };

  const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <style>${getCommonStyles(branding)}</style>
</head>
<body>
  ${getWatermarkHtml(company, branding)}
  ${getHeaderHtml(company, branding)}
  
  <h1 class="title">${labels.title} #${data.estimateId}</h1>
  <p><strong>Client:</strong> ${data.clientName}</p>
  <p><strong>Service:</strong> ${data.serviceType} (${data.frequency})</p>
  <p><strong>Property:</strong> ${data.squareFootage} sq ft - ${data.roomDetails}</p>
  ${data.extras.length > 0 ? `<p><strong>Extras:</strong> ${data.extras.join(', ')}</p>` : ''}
  <div class="total-box">
    <div class="total-label">Total Estimate</div>
    <div class="total-value">$${data.totalAmount}</div>
    <div class="total-label">per visit</div>
  </div>
  <p>${labels.validUntil}: ${data.validUntil}</p>
  
  <div class="footer">
    Estimate #${data.estimateId} | Generated on ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
  `;

  return html;
};

/**
 * Generate a payroll report PDF
 * Uses CLIENT COMPANY branding - NEVER ARKELIUM
 */
export const generatePayrollReportPdf = (
  data: PayrollReportData,
  company: CompanyProfile,
  branding: CompanyBranding
): string => {
  const employeeRows = data.employees.map(emp => `
    <tr>
      <td>${emp.name}</td>
      <td>${emp.regularHours}h</td>
      <td>${emp.overtimeHours}h</td>
      <td>$${emp.grossPay.toLocaleString()}</td>
      <td>$${emp.netPay.toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Outfit', sans-serif; }
    .header { text-align: center; color: ${branding.primaryColor || '#1a3d2e'}; margin-bottom: 30px; }
    .header img { max-width: 150px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
    th { background: ${branding.primaryColor || '#1a3d2e'}; color: white; }
    .total-row { background: #f5f5f5; font-weight: bold; }
    .watermark { 
      position: fixed; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%);
      opacity: 0.05;
      z-index: -1;
    }
    .watermark img { max-width: 350px; }
  </style>
</head>
<body>
  ${branding.logoUrl ? `<div class="watermark"><img src="${branding.logoUrl}" alt="" /></div>` : ''}
  <div class="header">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${company.companyName}" />` : ''}
    <h1>${company.companyName}</h1>
    <h2>Payroll Report</h2>
    <p>${data.periodStart} - ${data.periodEnd} | Province: ${data.province}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Employee</th>
        <th>Regular Hours</th>
        <th>Overtime</th>
        <th>Gross Pay</th>
        <th>Net Pay</th>
      </tr>
    </thead>
    <tbody>
      ${employeeRows}
      <tr class="total-row">
        <td>TOTALS</td>
        <td>${data.totals.hours}h</td>
        <td>-</td>
        <td>$${data.totals.gross.toLocaleString()}</td>
        <td>$${data.totals.net.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
  `;

  return html;
};

/**
 * Open PDF in a new window for printing/saving
 */
export const openPdfPreview = (htmlContent: string, filename: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.document.title = filename;
  }
};

/**
 * Export data to CSV format
 */
export const exportToCsv = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value ?? '');
      return strValue.includes(',') ? `"${strValue.replace(/"/g, '""')}"` : strValue;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
