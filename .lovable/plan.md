

## Plano: Filtro Dinâmico de Empresas em Módulos Operacionais

### Resumo da Análise

| Tela | Status Atual | Ação Necessária |
|------|--------------|-----------------|
| **Payments & Collections** | Usa `activeCompanyId` do store global | ⚠️ Migrar para `CompanyFilter` local após Search |
| **Financial (Ledger)** | Usa `activeCompanyId` do store global | ⚠️ Migrar para `CompanyFilter` local após Search + impactar exports |
| **Work & Time Tracking** | Busca `company_id` do profile do usuário | ⚠️ Migrar para `CompanyFilter` local + passar para hook |
| **Completed Services** | Usa `user.profile.company_id` fixo | ⚠️ Migrar para `CompanyFilter` local após Search |
| **Dashboard** | Já possui `CompanyFilter` mas posição incorreta | ✅ Ajustar posição (após Search se houver) |

---

### Padrão Unificado a Implementar

Todas as telas seguirão o mesmo padrão estabelecido em `Invoices.tsx` e `Receipts.tsx`:

```tsx
// 1. Importações
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { CompanyFilter } from '@/components/ui/company-filter';

// 2. Estado e Memos
const { companies: accessibleCompanies } = useAccessibleCompanies();
const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');

const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);

const queryCompanyIds = useMemo(() => {
  return selectedCompanyId === 'all' ? accessibleCompanyIds : [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);

// 3. Guard clause em fetch functions
if (queryCompanyIds.length === 0) {
  return { data: [], count: 0 };
}

// 4. Query com filtro de empresa
if (queryCompanyIds.length === 1) {
  query = query.eq('company_id', queryCompanyIds[0]);
} else {
  query = query.in('company_id', queryCompanyIds);
}

// 5. useEffect com dependência correta
useEffect(() => {
  if (accessibleCompanyIds.length > 0 || selectedCompanyId !== 'all') {
    refresh();
  }
}, [/* outros filtros */, selectedCompanyId, accessibleCompanyIds]);
```

---

## 1. Payments & Collections (`src/pages/PaymentsCollections.tsx`)

### Mudanças Necessárias

**Imports:**
```tsx
// Remover:
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';

// Adicionar:
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { CompanyFilter } from '@/components/ui/company-filter';
```

**Estado:**
```tsx
// Remover:
const { activeCompanyId } = useActiveCompanyStore();

// Adicionar:
const { companies: accessibleCompanies } = useAccessibleCompanies();
const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');

const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);
const queryCompanyIds = useMemo(() => {
  return selectedCompanyId === 'all' ? accessibleCompanyIds : [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);
```

**Funções de Fetch (fetchKpis, fetchCashCollections, fetchReceipts, fetchInvoices):**
- Substituir `activeCompanyId` por lógica `queryCompanyIds`
- Adicionar guard clause

**Header (Linha ~602-641):**
```tsx
<div className="flex flex-wrap items-center gap-3">
  <SearchInput ... />
  
  {/* NOVO - Company Filter logo após search */}
  <CompanyFilter
    value={selectedCompanyId}
    onChange={setSelectedCompanyId}
    showAllOption={accessibleCompanies.length > 1}
    allLabel="All Companies"
    className="w-[180px] h-8 text-xs flex-shrink-0"
  />
  
  <Select value={selectedStatus} ... />
  ...
</div>
```

**useEffect (Linha ~312-317):**
```tsx
useEffect(() => {
  if (accessibleCompanyIds.length > 0 || selectedCompanyId !== 'all') {
    cashPagination.refresh();
    receiptsPagination.refresh();
    invoicesPagination.refresh();
    fetchKpis();
  }
}, [selectedCompanyId, accessibleCompanyIds, dateRange, selectedStatus, debouncedSearch]);
```

---

## 2. Financial / Ledger (`src/pages/Financial.tsx`)

### Mudanças Necessárias

**Imports:**
```tsx
// Remover:
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';

// Adicionar:
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { CompanyFilter } from '@/components/ui/company-filter';
```

**Estado:**
```tsx
// Substituir:
const { activeCompanyId, activeCompanyName } = useActiveCompanyStore();

// Por:
const { companies: accessibleCompanies } = useAccessibleCompanies();
const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');

const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);
const queryCompanyIds = useMemo(() => {
  return selectedCompanyId === 'all' ? accessibleCompanyIds : [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);

// Para exports - nome da empresa selecionada
const selectedCompanyName = useMemo(() => {
  if (selectedCompanyId === 'all') return 'All Companies';
  return accessibleCompanies.find(c => c.id === selectedCompanyId)?.trade_name || 'Company';
}, [selectedCompanyId, accessibleCompanies]);
```

**fetchLedgerEntries:**
- Substituir `activeCompanyId` por lógica multi-company
- Ajustar `queryFinancialLedger` para aceitar array ou single company

**Exports (CSV/PDF):**
- Substituir `activeCompanyName` por `selectedCompanyName`
- Exibir nome correto da empresa no relatório

**Header (Linha ~697-750):**
```tsx
<div className="flex items-center justify-between gap-3 flex-wrap pb-1">
  <div className="flex items-center gap-3">
    <SearchInput ... />
    
    {/* NOVO - Company Filter após search */}
    <CompanyFilter
      value={selectedCompanyId}
      onChange={setSelectedCompanyId}
      showAllOption={accessibleCompanies.length > 1}
      allLabel="All Companies"
      className="w-[180px] h-8 text-xs flex-shrink-0"
    />
    
    <DatePickerDialog ... />
    ...
  </div>
</div>
```

---

## 3. Work & Time Tracking (`src/pages/WorkEarningsSummary.tsx` + `src/hooks/useWorkEarnings.ts`)

### Mudanças em `WorkEarningsSummary.tsx`

**Imports:**
```tsx
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { CompanyFilter } from '@/components/ui/company-filter';
import SearchInput from '@/components/ui/search-input';
```

**Estado:**
```tsx
const { companies: accessibleCompanies } = useAccessibleCompanies();
const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');
const [search, setSearch] = useState('');

const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);
const queryCompanyIds = useMemo(() => {
  return selectedCompanyId === 'all' ? accessibleCompanyIds : [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);
```

**Hook useWorkEarnings:**
- Modificar para aceitar `companyIds: string[]` como parâmetro
- Atualizar queries para filtrar por múltiplas empresas

**Header:**
```tsx
<div className="flex items-center gap-2">
  {/* NOVO - Search */}
  <SearchInput
    placeholder="Search employee..."
    value={search}
    onChange={setSearch}
    className="min-w-[120px] max-w-[200px] flex-shrink-0 h-8"
  />
  
  {/* NOVO - Company Filter */}
  <CompanyFilter
    value={selectedCompanyId}
    onChange={setSelectedCompanyId}
    showAllOption={accessibleCompanies.length > 1}
    allLabel="All Companies"
    className="w-[180px] h-8 text-xs flex-shrink-0"
  />

  {/* KPIs existentes... */}
</div>
```

### Mudanças em `useWorkEarnings.ts`

```tsx
export function useWorkEarnings(companyIds: string[]) {
  // ...
  
  const fetchData = useCallback(async () => {
    if (companyIds.length === 0) {
      setIsLoading(false);
      return;
    }
    
    // Build query with company filter
    let jobsQuery = supabase.from('jobs').select(...);
    
    if (companyIds.length === 1) {
      jobsQuery = jobsQuery.eq('company_id', companyIds[0]);
    } else {
      jobsQuery = jobsQuery.in('company_id', companyIds);
    }
    
    // ... resto do código
  }, [companyIds, period, excludeVisits]);
}
```

---

## 4. Completed Services (`src/pages/CompletedServices.tsx`)

### Mudanças Necessárias

**Imports:**
```tsx
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { CompanyFilter } from '@/components/ui/company-filter';
```

**Estado:**
```tsx
const { companies: accessibleCompanies } = useAccessibleCompanies();
const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');

const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);
const queryCompanyIds = useMemo(() => {
  return selectedCompanyId === 'all' ? accessibleCompanyIds : [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);
```

**Nota:** A RPC `get_completed_services_pending_invoices` precisará ser atualizada para aceitar parâmetro de company_ids ou o filtro será aplicado no cliente.

**Header:**
```tsx
<div className="flex items-center gap-2">
  <SearchInput ... />
  
  {/* NOVO */}
  <CompanyFilter
    value={selectedCompanyId}
    onChange={setSelectedCompanyId}
    showAllOption={accessibleCompanies.length > 1}
    allLabel="All Companies"
    className="w-[180px] h-8 text-xs flex-shrink-0"
  />
  
  {/* resto... */}
</div>
```

---

## Resumo das Mudanças por Arquivo

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/pages/PaymentsCollections.tsx` | Migrar de `activeCompanyStore` para `CompanyFilter` local |
| `src/pages/Financial.tsx` | Migrar de `activeCompanyStore` para `CompanyFilter` local + atualizar exports |
| `src/pages/WorkEarningsSummary.tsx` | Adicionar `CompanyFilter` + `SearchInput` + passar para hook |
| `src/hooks/useWorkEarnings.ts` | Aceitar `companyIds[]` como parâmetro ao invés de buscar do profile |
| `src/pages/CompletedServices.tsx` | Adicionar `CompanyFilter` após Search |

---

## Benefícios

1. **Consistência Visual**: Todas as telas operacionais seguem o mesmo padrão de layout
2. **Flexibilidade**: Usuários podem alternar entre empresas sem sair da tela
3. **Consolidação**: "All Companies" permite visão consolidada de dados multi-tenant
4. **Relatórios Corretos**: Exports (CSV/PDF) no Ledger refletem a empresa selecionada
5. **Dados em Tempo Real**: Alternar empresa atualiza dados imediatamente

