

## Plano: Adicionar Filtro Dinâmico de Empresas na Tela Receipts

### Análise Atual

| Componente | Status | Problema |
|------------|--------|----------|
| `payment_receipts.company_id` | ✅ Existe | Tabela já possui coluna `company_id` |
| `CompanyFilter` no Header | ❌ Ausente | Não existe filtro de empresa |
| Filtragem por empresa na query | ❌ Ausente | Query não filtra por `company_id` |

---

### Mudanças Necessárias

#### 1. Adicionar Importações

```tsx
// Novas importações
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { CompanyFilter } from '@/components/ui/company-filter';
import SearchInput from '@/components/ui/search-input';
```

---

#### 2. Adicionar Estado de Empresa

```tsx
// Dentro do componente Receipts
const { companies: accessibleCompanies, isLoading: isLoadingCompanies } = useAccessibleCompanies();

const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');

const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);

const queryCompanyIds = useMemo(() => {
  if (selectedCompanyId === 'all') {
    return accessibleCompanyIds;
  }
  return [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);
```

---

#### 3. Atualizar Query `fetchReceipts`

```tsx
const fetchReceipts = async () => {
  try {
    setLoading(true);
    
    // Guard: aguarda empresas carregarem
    if (queryCompanyIds.length === 0) {
      setReceipts([]);
      return;
    }
    
    let query = supabase
      .from('payment_receipts')
      .select(`
        *,
        clients(name, email),
        profiles:cleaner_id(first_name, last_name)
      `)
      .gte('service_date', format(dateRange.startDate, 'yyyy-MM-dd'))
      .lte('service_date', format(dateRange.endDate, 'yyyy-MM-dd'));
    
    // Aplicar filtro de empresa
    if (queryCompanyIds.length === 1) {
      query = query.eq('company_id', queryCompanyIds[0]);
    } else {
      query = query.in('company_id', queryCompanyIds);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    // ... resto do código
  }
};
```

---

#### 4. Atualizar `useEffect` para Incluir Empresa

```tsx
useEffect(() => {
  if (accessibleCompanyIds.length > 0 || selectedCompanyId !== 'all') {
    fetchReceipts();
  }
}, [dateRange, selectedCompanyId, accessibleCompanyIds]);
```

---

#### 5. Atualizar Header (Sequência: Search → Company → KPIs)

```tsx
<div className="flex items-center gap-2 flex-wrap">
  {/* Search Input - 1st */}
  <SearchInput
    placeholder="Search receipts..."
    value={searchQuery}
    onChange={setSearchQuery}
    className="min-w-[120px] max-w-[200px] flex-shrink-0 h-8"
  />
  
  {/* Company Filter - 2nd (NOVO) */}
  <CompanyFilter
    value={selectedCompanyId}
    onChange={setSelectedCompanyId}
    showAllOption={accessibleCompanies.length > 1}
    allLabel="All Companies"
    className="w-[180px] h-8 text-xs flex-shrink-0"
  />

  {/* Inline KPIs - permanece */}
  <div className="flex items-center gap-2 flex-1">
    ...
  </div>

  {/* Date Filter - permanece */}
  <PeriodSelector value={dateRange} onChange={setDateRange} className="shrink-0" />
  
  {/* Generate Button - permanece */}
  <Button onClick={() => setGenerateModalOpen(true)} size="sm" className="gap-1.5 h-8">
    <Plus className="h-4 w-4" />
    Generate Receipt
  </Button>
</div>
```

---

### Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Receipts.tsx` | Adicionar importações: `useAccessibleCompanies`, `CompanyFilter`, `SearchInput` |
| `src/pages/Receipts.tsx` | Adicionar estado: `selectedCompanyId`, `accessibleCompanyIds`, `queryCompanyIds` |
| `src/pages/Receipts.tsx` | Atualizar `fetchReceipts` para filtrar por `company_id` |
| `src/pages/Receipts.tsx` | Atualizar `useEffect` para incluir `accessibleCompanyIds` e `selectedCompanyId` |
| `src/pages/Receipts.tsx` | Atualizar header: Trocar Input por SearchInput + adicionar CompanyFilter após search |

---

### Resultado Visual Esperado

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [🏢 All Companies ▼] [Total 6] [$1502.90] [Sent 6/6] [📅] [+ Generate]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ USUÁRIO ABRE RECEIPTS                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. useAccessibleCompanies carrega empresas                             │
│ 2. selectedCompanyId = 'all' (padrão)                                  │
│ 3. accessibleCompanyIds = ['uuid1', 'uuid2', ...]                      │
│ 4. queryCompanyIds = accessibleCompanyIds (pois 'all')                 │
│ 5. useEffect dispara fetchReceipts()                                   │
│ 6. Query: .in('company_id', queryCompanyIds)                           │
│ 7. Dados renderizam automaticamente ✓                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ USUÁRIO SELECIONA "TIDY OUT"                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. selectedCompanyId = 'uuid-tidy-out'                                 │
│ 2. queryCompanyIds = ['uuid-tidy-out']                                 │
│ 3. useEffect dispara fetchReceipts()                                   │
│ 4. Query: .eq('company_id', 'uuid-tidy-out')                           │
│ 5. Dados filtrados renderizam ✓                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

