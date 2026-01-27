
## Plano: Adicionar Coluna "Company" nas Tabelas e Incluir na Busca

### Problema Identificado

Quando "All Companies" está selecionado, os registros de múltiplas empresas são exibidos nas tabelas, mas **não há como identificar visualmente a qual empresa cada registro pertence**. Além disso, a **barra de pesquisa não busca pelo nome da empresa**.

| Tela | Status Atual | Problema |
|------|--------------|----------|
| **Invoices** | ❌ Sem coluna Company | Sem identificação visual da empresa |
| **Receipts** | ❌ Sem coluna Company | Sem identificação visual da empresa |
| **Payments & Collections** | ❌ Sem coluna Company | Sem identificação visual da empresa |
| **Financial (Ledger)** | ❌ Sem coluna Company | Sem identificação visual da empresa |
| **Work & Time Tracking** | ❌ Sem coluna Company | Sem identificação visual da empresa |
| **Completed Services** | ❌ Sem coluna Company | Sem identificação visual da empresa |

---

### Solução

Para cada tela operacional:

1. **Atualizar a Query Supabase** para incluir join com a tabela `companies`:
   ```sql
   companies:company_id(trade_name)
   ```

2. **Mapear o campo `company_name`** no objeto de dados

3. **Adicionar coluna "Company" na tabela** (posição estratégica após dados primários)

4. **Incluir empresa na função de busca/filtro** da barra de pesquisa

---

## Mudanças por Arquivo

### 1. Invoices (`src/pages/Invoices.tsx`)

**Query - Adicionar join com companies:**
```tsx
// Linha ~189-226 - Atualizar select
.select(`
  id,
  invoice_number,
  ...
  companies:company_id(trade_name),  // NOVO
  clients ( ... ),
  ...
`)
```

**Interface Invoice - Adicionar campo:**
```tsx
interface Invoice {
  // ... campos existentes
  companyName: string;  // NOVO
}
```

**Mapeamento - Adicionar company_name:**
```tsx
const mappedInvoices = (invoicesData || []).map((inv: any) => ({
  ...
  companyName: inv.companies?.trade_name || 'Unknown',  // NOVO
}));
```

**Coluna na tabela - Adicionar após "Invoice #":**
```tsx
const columns: Column<Invoice>[] = [
  { key: 'invoiceNumber', header: 'Invoice #', ... },
  { key: 'companyName', header: 'Company' },  // NOVO
  { key: 'clientName', header: 'Client', ... },
  ...
];
```

**Busca - Incluir empresa:**
```tsx
// Linha ~241-242
if (debouncedSearch) {
  query = query.or(`invoice_number.ilike.%${debouncedSearch}%,clients.name.ilike.%${debouncedSearch}%,companies.trade_name.ilike.%${debouncedSearch}%`);
}
```

---

### 2. Receipts (`src/pages/Receipts.tsx`)

**Query - Adicionar join:**
```tsx
.select(`
  *,
  clients(name, email),
  profiles:cleaner_id(first_name, last_name),
  companies:company_id(trade_name)  // NOVO
`)
```

**Interface PaymentReceipt:**
```tsx
interface PaymentReceipt {
  // ... campos existentes
  company_name?: string;  // NOVO
}
```

**Mapeamento:**
```tsx
const mappedData = (data || []).map(r => ({
  ...r,
  company_name: (r.companies as any)?.trade_name || '-',  // NOVO
  ...
}));
```

**Coluna na tabela - Após "Receipt #":**
```tsx
<TableHead>Receipt #</TableHead>
<TableHead>Company</TableHead>  // NOVO
<TableHead>Client</TableHead>
```

**Busca - Incluir empresa:**
```tsx
const filteredReceipts = receipts.filter(receipt => {
  const query = searchQuery.toLowerCase();
  return (
    receipt.receipt_number.toLowerCase().includes(query) ||
    (receipt.company_name || '').toLowerCase().includes(query) ||  // NOVO
    (receipt.client_name || '').toLowerCase().includes(query) ||
    ...
  );
});
```

---

### 3. Payments & Collections (`src/pages/PaymentsCollections.tsx`)

**Aplicar o mesmo padrão para as 3 tabs:**

**Cash Collections Query (~Linha 199-246):**
```tsx
.select(`
  *,
  client:client_id(name),
  cleaner:cleaner_id(first_name, last_name),
  receipt:payment_receipt_id(receipt_number),
  companies:company_id(trade_name)  // NOVO
`)

// Mapping
company_name: c.companies?.trade_name || 'Unknown',
```

**Receipts Query (~Linha 249-291):**
```tsx
.select(`
  *,
  client:client_id(name),
  cleaner:cleaner_id(first_name, last_name),
  companies:company_id(trade_name)  // NOVO
`)

// Mapping
company_name: r.companies?.trade_name || 'Unknown',
```

**Invoices Query (~Linha 294-339):**
```tsx
.select(`
  *,
  client:client_id(name),
  cleaner:cleaner_id(first_name, last_name),
  companies:company_id(trade_name)  // NOVO
`)

// Mapping
company_name: i.companies?.trade_name || 'Unknown',
```

**Colunas nas tabelas (Cash, Receipts, Invoices):**
```tsx
// Cash columns (~Linha 461)
const cashColumns = [
  { key: 'service_date', header: 'Date' },
  { key: 'company_name', header: 'Company' },  // NOVO
  { key: 'client_name', header: 'Client' },
  ...
];

// Receipts columns
{ key: 'company_name', header: 'Company' },  // NOVO

// Invoices columns
{ key: 'company_name', header: 'Company' },  // NOVO
```

---

### 4. Financial / Ledger (`src/pages/Financial.tsx`)

**A view `financial_ledger` já deve ter o campo company. Precisamos verificar e adicionar coluna.**

Se não existir na view, adicionar via helper:

**Opção 1 - Usar `accessibleCompanies` para mapear:**
```tsx
// Durante o processamento dos entries
const enrichedEntries = entries.map(e => ({
  ...e,
  companyName: accessibleCompanies.find(c => c.id === e.company_id)?.trade_name || 'Unknown',
}));
```

**Coluna na tabela:**
```tsx
// Adicionar coluna Company
{ key: 'companyName', header: 'Company' },
```

**Busca - Incluir empresa:**
```tsx
// No search filter, adicionar company name
```

---

### 5. Work & Time Tracking (`src/pages/WorkEarningsSummary.tsx`)

**Atualizar hook `useWorkEarnings.ts`:**
```tsx
// No fetchData, adicionar join com companies
.select(`
  ...,
  companies:company_id(trade_name)
`)
```

**Interface CleanerWorkSummary:**
```tsx
interface CleanerWorkSummary {
  // ... campos existentes
  companyName?: string;  // NOVO
}
```

**Coluna na tabela:**
```tsx
<TableHead>Employee</TableHead>
<TableHead>Company</TableHead>  // NOVO
<TableHead>Role</TableHead>
```

**Busca - Incluir empresa:**
```tsx
const filteredSummaries = useMemo(() => {
  if (!search.trim()) return cleanerSummaries;
  const q = search.toLowerCase();
  return cleanerSummaries.filter(c => 
    c.cleanerName.toLowerCase().includes(q) ||
    (c.companyName || '').toLowerCase().includes(q)  // NOVO
  );
}, [cleanerSummaries, search]);
```

---

### 6. Completed Services (`src/pages/CompletedServices.tsx`)

**Atualizar RPC ou query para incluir company_name:**

Se usando RPC `get_completed_services_pending_invoices`, o RPC precisaria retornar company_name.

**Alternativa - Mapear via accessibleCompanies:**
```tsx
const mappedServices = (allPendingServices || []).map((job: any) => ({
  ...
  companyName: accessibleCompanies.find(c => c.id === job.company_id)?.trade_name || 'Unknown',
}));
```

**Coluna na tabela:**
```tsx
const columns: Column<CompletedService>[] = [
  { key: 'select', header: 'Select' },
  { key: 'companyName', header: 'Company' },  // NOVO
  { key: 'clientName', header: 'Client' },
  ...
];
```

**Busca - Incluir empresa:**
```tsx
mappedServices = mappedServices.filter(s =>
  s.clientName.toLowerCase().includes(q) ||
  s.companyName?.toLowerCase().includes(q) ||  // NOVO
  s.employeeName.toLowerCase().includes(q) ||
  s.address.toLowerCase().includes(q)
);
```

---

## Resumo das Mudanças

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Invoices.tsx` | Join companies, add column, update search |
| `src/pages/Receipts.tsx` | Join companies, add column, update search |
| `src/pages/PaymentsCollections.tsx` | Join companies in 3 queries, add columns, update search |
| `src/pages/Financial.tsx` | Map company name, add column, update search |
| `src/pages/WorkEarningsSummary.tsx` | Add company column, update search |
| `src/hooks/useWorkEarnings.ts` | Join companies in queries |
| `src/pages/CompletedServices.tsx` | Map company name, add column, update search |

---

## Resultado Visual Esperado

Quando "All Companies" estiver selecionado:

```text
┌──────────────┬─────────────┬──────────────┬──────────────┬──────────┐
│ Invoice #    │ Company     │ Client       │ Service Date │ Amount   │
├──────────────┼─────────────┼──────────────┼──────────────┼──────────┤
│ INV-2025-001 │ Tidy Out    │ John Smith   │ Jan 15, 2025 │ $150.00  │
│ INV-2025-002 │ CleanPro    │ Jane Doe     │ Jan 16, 2025 │ $200.00  │
│ INV-2025-003 │ Tidy Out    │ Bob Wilson   │ Jan 17, 2025 │ $175.00  │
└──────────────┴─────────────┴──────────────┴──────────────┴──────────┘
```

Pesquisando "Tidy" na barra de busca filtrará todos os registros da empresa "Tidy Out".
