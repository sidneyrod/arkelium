import { useState, useEffect, useCallback } from 'react';

export interface LedgerColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMN_ORDER: LedgerColumnConfig[] = [
  { key: 'transactionDate', label: 'Date', visible: true },
  { key: 'companyName', label: 'Company', visible: true },
  { key: 'eventType', label: 'Type', visible: true },
  { key: 'referenceNumber', label: 'Reference', visible: true },
  { key: 'clientName', label: 'Client', visible: true },
  { key: 'cleanerName', label: 'Employee', visible: true },
  { key: 'paymentMethod', label: 'Payment', visible: true },
  { key: 'grossAmount', label: 'Gross', visible: true },
  { key: 'deductions', label: 'Deductions', visible: true },
  { key: 'netAmount', label: 'Net', visible: true },
  { key: 'status', label: 'Status', visible: true },
];

const STORAGE_KEY = 'ledger-column-config';

export function useLedgerColumnOrder() {
  const [columnConfig, setColumnConfig] = useState<LedgerColumnConfig[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LedgerColumnConfig[];
        // Merge with defaults to handle new columns
        const defaultKeys = DEFAULT_COLUMN_ORDER.map(c => c.key);
        const storedKeys = parsed.map(c => c.key);
        
        // Add any new columns that weren't in storage
        const newColumns = DEFAULT_COLUMN_ORDER.filter(c => !storedKeys.includes(c.key));
        
        // Filter out any removed columns
        const validColumns = parsed.filter(c => defaultKeys.includes(c.key));
        
        return [...validColumns, ...newColumns];
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_COLUMN_ORDER;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnConfig));
  }, [columnConfig]);

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumnConfig(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      return updated;
    });
  }, []);

  const toggleColumnVisibility = useCallback((key: string) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const resetToDefaults = useCallback(() => {
    setColumnConfig(DEFAULT_COLUMN_ORDER);
  }, []);

  const setNewOrder = useCallback((newOrder: LedgerColumnConfig[]) => {
    setColumnConfig(newOrder);
  }, []);

  const visibleColumns = columnConfig.filter(c => c.visible);

  return {
    columnConfig,
    visibleColumns,
    reorderColumns,
    toggleColumnVisibility,
    resetToDefaults,
    setNewOrder,
  };
}
