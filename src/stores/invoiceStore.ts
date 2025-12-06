import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  
  // Client & Location
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress: string;
  
  // Service Location
  serviceLocationId?: string;
  serviceAddress: string;
  
  // Job reference
  jobId: string;
  cleanerName: string;
  cleanerId: string;
  
  // Dates
  serviceDate: string;
  serviceDuration: string;
  createdAt: string;
  dueDate: string;
  paidAt?: string;
  
  // Pricing
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  
  // Status
  status: InvoiceStatus;
  
  // Notes
  notes?: string;
}

interface InvoiceState {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markAsPaid: (id: string) => void;
  markAsSent: (id: string) => void;
  getInvoiceByJobId: (jobId: string) => Invoice | undefined;
  getInvoicesByClient: (clientId: string) => Invoice[];
  getInvoicesByCleaner: (cleanerId: string) => Invoice[];
}

const generateInvoiceNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
};

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],
      
      addInvoice: (invoiceData) => {
        const newInvoice: Invoice = {
          ...invoiceData,
          id: crypto.randomUUID(),
          invoiceNumber: generateInvoiceNumber(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          invoices: [...state.invoices, newInvoice]
        }));
        return newInvoice;
      },
      
      updateInvoice: (id, updates) => set((state) => ({
        invoices: state.invoices.map((inv) => 
          inv.id === id ? { ...inv, ...updates } : inv
        )
      })),
      
      deleteInvoice: (id) => set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id)
      })),
      
      markAsPaid: (id) => set((state) => ({
        invoices: state.invoices.map((inv) => 
          inv.id === id ? { ...inv, status: 'paid', paidAt: new Date().toISOString() } : inv
        )
      })),
      
      markAsSent: (id) => set((state) => ({
        invoices: state.invoices.map((inv) => 
          inv.id === id ? { ...inv, status: 'sent' } : inv
        )
      })),
      
      getInvoiceByJobId: (jobId) => {
        return get().invoices.find((inv) => inv.jobId === jobId);
      },
      
      getInvoicesByClient: (clientId) => {
        return get().invoices.filter((inv) => inv.clientId === clientId);
      },
      
      getInvoicesByCleaner: (cleanerId) => {
        return get().invoices.filter((inv) => inv.cleanerId === cleanerId);
      },
    }),
    { name: 'invoice-store' }
  )
);