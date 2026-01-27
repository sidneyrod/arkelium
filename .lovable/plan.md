

## Plano: Padronização do Header Invoices + Correções de Dados

### Problemas Identificados

| # | Problema | Localização | Impacto |
|---|----------|-------------|---------|
| 1 | **CompanyFilter não elegante** | `Invoices.tsx:499-505` | Layout inconsistente com Schedule |
| 2 | **Sequência errada** | `Invoices.tsx:497-560` | Company está antes da barra de pesquisa |
| 3 | **Dados não atualizam ao mudar empresa** | `Invoices.tsx:311-313` | `selectedCompanyId` ausente das dependências do `useEffect` |
| 4 | **Busca por texto funciona** | `Invoices.tsx:241-242` | Busca correta por `invoice_number` e `clients.name` (OK) |

---

### Solução 1: Reordenar Campos do Header

**Sequência Atual:**
```text
[Company Filter] → [Search] → [Status] → [KPIs] → [Period]
```

**Nova Sequência (padrão Schedule):**
```text
[Search] → [Company Filter] → [Status] → [KPIs] → [Period]
```

---

### Solução 2: Padronizar Estilo do CompanyFilter

**Invoices (Atual):**
```tsx
<CompanyFilter
  value={selectedCompanyId}
  onChange={setSelectedCompanyId}
  showAllOption={accessibleCompanies.length > 1}
  allLabel="All Companies"
  className="w-[160px] h-8"  // Mais estreito
/>
```

**Schedule (Referência):**
```tsx
<CompanyFilter
  value={selectedCompanyId}
  onChange={(value) => setSelectedCompanyId(value === 'all' ? '' : value)}
  showAllOption={false}
  placeholder="Select Company"
  className="w-[180px] h-8 text-xs flex-shrink-0"  // Mais largo, sem wrap
/>
```

**Invoices (Novo):**
```tsx
<CompanyFilter
  value={selectedCompanyId}
  onChange={setSelectedCompanyId}
  showAllOption={accessibleCompanies.length > 1}
  allLabel="All Companies"
  className="w-[180px] h-8 text-xs flex-shrink-0"  // Padronizado
/>
```

---

### Solução 3: Adicionar `selectedCompanyId` às Dependências do Refresh

**Linha 311-313 - Atual:**
```tsx
useEffect(() => {
  refresh();
}, [dateRange, statusFilter, debouncedSearch]);  // ❌ Faltando selectedCompanyId
```

**Após correção:**
```tsx
useEffect(() => {
  refresh();
}, [dateRange, statusFilter, debouncedSearch, selectedCompanyId]);  // ✓ Incluído
```

---

### Solução 4: Ajustar SearchInput para Consistência

**Atual:**
```tsx
<SearchInput
  placeholder="Search invoices..."
  value={search}
  onChange={setSearch}
  className="w-full sm:w-40"  // Largura variável
/>
```

**Novo (padrão Schedule):**
```tsx
<SearchInput
  placeholder="Search invoices..."
  value={search}
  onChange={setSearch}
  className="min-w-[120px] max-w-[200px] flex-shrink-0 h-8"  // Largura fixa, sem wrap
/>
```

---

### Resumo das Mudanças

| Arquivo | Linha(s) | Mudança |
|---------|----------|---------|
| `src/pages/Invoices.tsx` | 497-559 | Reordenar: Search → Company → Status → KPIs → Period |
| `src/pages/Invoices.tsx` | ~505 | Padronizar CompanyFilter: `w-[180px] text-xs flex-shrink-0` |
| `src/pages/Invoices.tsx` | ~512 | Padronizar SearchInput: `min-w-[120px] max-w-[200px] flex-shrink-0` |
| `src/pages/Invoices.tsx` | 313 | Adicionar `selectedCompanyId` ao array de dependências |

---

### Resultado Visual Esperado

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [🏢 Select Company ▼] [All Status ▼] [Total] [Paid] [Pending] [$] [📅] │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Verificação Funcional

- **Mudar empresa:** Dados recarregam automaticamente ✓
- **Buscar por texto:** Filtra por invoice_number e client.name ✓ (já funcionando)
- **Layout consistente:** Mesma aparência do Schedule ✓

