

## Plano: Carregar Dados de Invoices ao Abrir a Página

### Problema Identificado

| Causa Raiz | Localização | Impacto |
|------------|-------------|---------|
| **`useEffect` dispara antes das empresas carregarem** | `Invoices.tsx:311-313` | `queryCompanyIds` está vazio na primeira execução, retornando 0 resultados |

### Fluxo do Bug

```text
┌─────────────────────────────────────────────────────────────────────┐
│ PÁGINA CARREGA                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ 1. selectedCompanyId = 'all' ✓                                     │
│ 2. accessibleCompanies = [] (ainda carregando)                     │
│ 3. accessibleCompanyIds = [] (mapeado de array vazio)              │
│ 4. queryCompanyIds = [] (selectedCompanyId='all' → usa accessibles)│
│ 5. useEffect dispara refresh()                                     │
│ 6. fetchInvoices: queryCompanyIds.length === 0 → return vazio     │
│ 7. Dados: 0 invoices ❌                                             │
│                                                                     │
│ ...algum tempo depois...                                            │
│                                                                     │
│ 8. accessibleCompanies carrega [Tidy Out, ...]                     │
│ 9. MAS nenhum useEffect dispara novo refresh!                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Solução

Adicionar `accessibleCompanyIds` ao array de dependências do `useEffect` que chama `refresh()`. Dessa forma, quando as empresas acessíveis terminarem de carregar, o `useEffect` será re-disparado e os dados serão buscados corretamente.

**Linha 311-313 - Atual:**
```tsx
useEffect(() => {
  refresh();
}, [dateRange, statusFilter, debouncedSearch, selectedCompanyId]);
```

**Após correção:**
```tsx
useEffect(() => {
  // Only refresh if we have companies to query
  if (accessibleCompanyIds.length > 0 || selectedCompanyId !== 'all') {
    refresh();
  }
}, [dateRange, statusFilter, debouncedSearch, selectedCompanyId, accessibleCompanyIds]);
```

---

### Detalhes da Mudança

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/pages/Invoices.tsx` | 311-313 | Adicionar `accessibleCompanyIds` às dependências e condição de guarda |

---

### Código Completo

```tsx
// src/pages/Invoices.tsx - Linhas 310-314

// Refresh when filters change OR when accessible companies finish loading
useEffect(() => {
  // Only refresh if we have companies to query (prevents empty query on mount)
  if (accessibleCompanyIds.length > 0 || selectedCompanyId !== 'all') {
    refresh();
  }
}, [dateRange, statusFilter, debouncedSearch, selectedCompanyId, accessibleCompanyIds]);
```

---

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│ PÁGINA CARREGA                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ 1. selectedCompanyId = 'all' ✓                                     │
│ 2. accessibleCompanies = [] (ainda carregando)                     │
│ 3. accessibleCompanyIds = []                                       │
│ 4. useEffect dispara, MAS condição falha:                          │
│    accessibleCompanyIds.length > 0 = false                         │
│    selectedCompanyId !== 'all' = false                             │
│    → refresh() NÃO é chamado                                       │
│                                                                     │
│ ...empresas carregam...                                             │
│                                                                     │
│ 5. accessibleCompanies = [Tidy Out, ...]                           │
│ 6. accessibleCompanyIds = ['uuid1', 'uuid2']                       │
│ 7. useEffect DISPARA novamente (dependência mudou)                 │
│ 8. Condição accessibleCompanyIds.length > 0 = true ✓               │
│ 9. refresh() é chamado                                             │
│ 10. Dados: invoices carregadas ✓                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Resumo

- **1 mudança** no useEffect
- Adiciona `accessibleCompanyIds` às dependências
- Adiciona condição de guarda para evitar query vazia no mount inicial
- Resultado: Dados renderizam automaticamente quando "All Companies" está selecionado

