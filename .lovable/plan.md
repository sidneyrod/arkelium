

## Plano: Refatorar Seleção de Empresa no Schedule

### Problema Atual
- O Schedule mostra "All Companies" por padrão, trazendo jobs de todas as empresas acessíveis
- Isso pode causar confusão sobre qual job pertence a qual empresa
- Os cards não identificam claramente a empresa de origem

### Solução Proposta

**Arquivos a modificar:**
- `src/pages/Schedule.tsx`
- `src/components/ui/company-filter.tsx`

---

### Fase 1: Atualizar o Estado Inicial no Schedule

**Arquivo:** `src/pages/Schedule.tsx`

1. Mudar o estado inicial de `'all'` para `''` (vazio):
```typescript
// Antes (linha 212):
const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');

// Depois:
const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
```

2. Atualizar a lógica de query para não buscar dados quando nenhuma empresa está selecionada:
```typescript
// Antes (linha 265-270):
const queryCompanyIds = useMemo(() => {
  if (selectedCompanyId === 'all') {
    return accessibleCompanyIds;
  }
  return [selectedCompanyId];
}, [selectedCompanyId, accessibleCompanyIds]);

// Depois:
const queryCompanyIds = useMemo(() => {
  // Se nenhuma empresa selecionada, retorna array vazio
  if (!selectedCompanyId || selectedCompanyId === '') {
    return [];
  }
  return [selectedCompanyId];
}, [selectedCompanyId]);
```

3. Atualizar a query para retornar vazio quando não há empresa selecionada:
```typescript
// Dentro do queryFn (linhas 275-286):
if (queryCompanyIds.length === 0) {
  // Sem empresa selecionada - retornar lista vazia
  return [];
}
```

---

### Fase 2: Remover Opção "All Companies" do Header

**Arquivo:** `src/pages/Schedule.tsx` (linhas 1639-1645)

```typescript
// Antes:
<CompanyFilter
  value={selectedCompanyId}
  onChange={setSelectedCompanyId}
  showAllOption={accessibleCompanies.length > 1}
  allLabel="All Companies"
  className="w-[180px] h-8 text-xs flex-shrink-0"
/>

// Depois:
<CompanyFilter
  value={selectedCompanyId}
  onChange={setSelectedCompanyId}
  showAllOption={false}  // Nunca mostrar "All Companies"
  placeholder="Select Company"  // Novo prop
  className="w-[180px] h-8 text-xs flex-shrink-0"
/>
```

---

### Fase 3: Adicionar Suporte a Placeholder no CompanyFilter

**Arquivo:** `src/components/ui/company-filter.tsx`

1. Adicionar nova prop `placeholder`:
```typescript
export interface CompanyFilterProps {
  value: string | 'all';
  onChange: (companyId: string | 'all') => void;
  showAllOption?: boolean;
  allLabel?: string;
  placeholder?: string;  // NOVO
  className?: string;
  disabled?: boolean;
  activeOnly?: boolean;
}
```

2. Atualizar a renderização do SelectValue:
```typescript
<SelectValue placeholder={placeholder || "Select company"}>
  {!value || value === '' ? (
    <span className="flex items-center gap-2 text-muted-foreground">
      <Building2 className="h-4 w-4" />
      <span>{placeholder || "Select Company"}</span>
    </span>
  ) : value === 'all' ? (
    // ... existing all logic
  ) : (
    // ... existing company display logic
  )}
</SelectValue>
```

---

### Fase 4: Exibir Estado Vazio no Calendário

Quando nenhuma empresa estiver selecionada, mostrar mensagem orientando o usuário.

**Arquivo:** `src/pages/Schedule.tsx`

Adicionar verificação antes de renderizar as views:
```typescript
{/* Empty state when no company selected */}
{!selectedCompanyId && (
  <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
    <div className="text-center p-8">
      <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
      <h3 className="font-medium text-lg mb-2">Select a Company</h3>
      <p className="text-sm text-muted-foreground">
        Choose a company from the dropdown above to view its schedule
      </p>
    </div>
  </div>
)}

{/* Existing calendar views - only render when company is selected */}
{selectedCompanyId && (
  // ... existing Week/Day/Month/Timeline views
)}
```

---

### Resumo das Mudanças

| Componente | Mudança |
|------------|---------|
| Estado inicial | `'all'` → `''` (vazio) |
| CompanyFilter | Remover `showAllOption`, adicionar `placeholder` |
| Query | Retornar `[]` quando `selectedCompanyId` está vazio |
| UI | Mostrar estado vazio com instrução ao usuário |

---

### Resultado Esperado

1. Ao abrir o Schedule, o dropdown mostra **"Select Company"**
2. O calendário mostra uma mensagem orientando a selecionar uma empresa
3. KPIs mostram 0 até uma empresa ser selecionada
4. Ao selecionar uma empresa, apenas os jobs daquela empresa aparecem
5. Não há mais opção "All Companies" no dropdown

