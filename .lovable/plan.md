
## Plano: Remover Headers e Company Filter das Telas Companies e Business

### Problemas Identificados

| Tela | Problema | Local no Código |
|------|----------|-----------------|
| **Companies** | Título "Companies" e descrição "Manage your business companies" desnecessários | `src/pages/Companies.tsx` linhas 300-303 |
| **Business** | Título "Business Settings" e "Configuring: {company}" desnecessários | `src/pages/Business.tsx` linhas 529-540 |
| **Business** | CompanyFilter não necessário (dados serão dinâmicos) | `src/pages/Business.tsx` linhas 534-539 |

---

## Mudanças Detalhadas

### 1. Companies.tsx

**Antes (linhas 298-304):**
```tsx
return (
  <div className="p-2 lg:p-3 space-y-4">
    <PageHeader 
      title="Companies" 
      description="Manage your business companies"
    />

    <CompanyListTable ...
```

**Depois:**
```tsx
return (
  <div className="p-2 lg:p-3 space-y-2">
    <CompanyListTable ...
```

**Mudanças:**
- Remover completamente o `<PageHeader />` (título e descrição)
- Ajustar `space-y-4` para `space-y-2` (menos espaço vertical)
- Remover import de `PageHeader` se não utilizado em outros lugares

---

### 2. Business.tsx

**Antes (linhas 526-541):**
```tsx
return (
  <div className="p-2 lg:p-3 space-y-2">
    {/* Header with Company Filter */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <PageHeader 
        title="Business Settings" 
        description={selectedCompanyName ? `Configuring: ${selectedCompanyName}` : 'Select a company to configure'}
      />
      <CompanyFilter
        value={selectedCompanyId}
        onChange={setSelectedCompanyId}
        showAllOption={false}
        className="w-[200px]"
      />
    </div>

    <Tabs ...
```

**Depois:**
```tsx
return (
  <div className="p-2 lg:p-3">
    <Tabs ...
```

**Mudanças:**
- Remover todo o bloco `<div className="flex flex-col...">` com `PageHeader` e `CompanyFilter`
- Remover `space-y-2` do container principal (as Tabs já têm espaçamento interno)
- Remover variável `selectedCompanyName` (linha 524) pois não será mais usada
- Remover import de `PageHeader` e `CompanyFilter`
- **Nota:** A lógica de `selectedCompanyId` permanece para carregar dados, mas o usuário não terá controle manual - será dinâmico baseado em contexto global

---

## Imports a Remover

### Companies.tsx
```tsx
// Remover se não utilizado
import PageHeader from '@/components/ui/page-header';
```

### Business.tsx
```tsx
// Remover (não mais usado)
import { CompanyFilter } from '@/components/ui/company-filter';
import PageHeader from '@/components/ui/page-header';
```

---

## Resultado Visual Esperado

### Companies (Antes vs Depois)

**Antes:**
```text
┌──────────────────────────────────────────────┐
│ Companies                                    │
│ Manage your business companies               │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ 🏢 Registered Companies   [Search] [+] │  │
```

**Depois:**
```text
┌──────────────────────────────────────────────┐
│ ┌────────────────────────────────────────┐  │
│ │ 🏢 Registered Companies   [Search] [+] │  │
```

---

### Business (Antes vs Depois)

**Antes:**
```text
┌────────────────────────────────────────────────────────┐
│ Business Settings          [🏢 Tidy Out ▼]             │
│ Configuring: Tidy Out                                  │
│                                                        │
│ [Activities] [Branding] [Estimates] [Schedule] [Pref]  │
```

**Depois:**
```text
┌────────────────────────────────────────────────────────┐
│ [Activities] [Branding] [Estimates] [Schedule] [Pref]  │
│                                                        │
│ Content...                                             │
```

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/Companies.tsx` | Remover `PageHeader`, ajustar espaçamento |
| `src/pages/Business.tsx` | Remover `PageHeader`, `CompanyFilter`, ajustar espaçamento, limpar imports |
