

## Plano: Ajustar Nomes das Abas, Barra de Pesquisa e Modal de Registro

### Problemas Identificados

| Problema | Local | Causa |
|----------|-------|-------|
| Abas "Companies" e "Business" mostram "Page" | `AppLayout.tsx` | Rotas `/companies` e `/business` não estão mapeadas em `getPageLabel` |
| Barra de pesquisa com nomes incorretos | `TopBar.tsx` | `navigationItems` não atualizado com novas rotas e nomes corretos |
| Modal "Register New Company" muito estreito | `EditCompanyModal.tsx` | `max-w-[600px]` e layout de campos não otimizado |

---

## 1. Corrigir Nomes das Abas (`AppLayout.tsx`)

**Arquivo:** `src/components/layout/AppLayout.tsx`

**Mudança:** Adicionar mapeamento para `/companies` e `/business` no `pathMap`:

```tsx
const getPageLabel = (path: string, t: any): string => {
  const pathMap: Record<string, string> = {
    '/': t?.nav?.dashboard || 'Dashboard',
    '/companies': 'Companies',           // NOVO
    '/business': 'Business',             // NOVO
    '/company': t?.nav?.company || 'Company',  // Manter para compatibilidade
    // ... resto existente
  };
  return pathMap[path] || 'Page';
};
```

---

## 2. Corrigir Barra de Pesquisa (`TopBar.tsx`)

**Arquivo:** `src/components/layout/TopBar.tsx`

**Mudanças no `navigationItems`:**

```tsx
const navigationItems = [
  // ... existentes
  
  // ATUALIZAR Activity Log para incluir "Audit"
  { id: 'activity-log', title: 'Audit & Activity Log', path: '/activity-log', keywords: [...] },
  
  // REMOVER ou atualizar entrada antiga de Company
  // { id: 'company', title: 'Company', path: '/company', keywords: [...] }, // REMOVER
  
  // ADICIONAR novas rotas
  { id: 'companies', title: 'Companies', path: '/companies', keywords: ['companies', 'empresas', 'register', 'cadastro'] },
  { id: 'business', title: 'Business', path: '/business', keywords: ['business', 'negócio', 'branding', 'estimates', 'preferences', 'settings'] },
];
```

---

## 3. Melhorar Modal de Registro (`EditCompanyModal.tsx`)

**Arquivo:** `src/components/company/EditCompanyModal.tsx`

### 3.1. Aumentar Largura do Modal

```tsx
// De:
<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">

// Para:
<DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-5">
```

### 3.2. Reduzir Tamanho do Título

```tsx
// De:
<DialogTitle className="flex items-center gap-2">

// Para:
<DialogTitle className="flex items-center gap-2 text-base font-semibold">
```

### 3.3. Reorganizar Campos em Mais Colunas

**Substituir layout atual por grade mais densa:**

```tsx
<div className="space-y-3 py-3">
  {/* Row 1: Company Name + Legal Name */}
  <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-1.5">
      <Label className="text-xs">Company Name *</Label>
      <Input ... className="h-9" />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Legal Name *</Label>
      <Input ... className="h-9" />
    </div>
  </div>

  {/* Row 2: Address (full width) */}
  <div className="space-y-1.5">
    <Label className="text-xs">Address</Label>
    <Input ... className="h-9" />
  </div>

  {/* Row 3: City + Province + Postal Code (3 columns) */}
  <div className="grid gap-3 sm:grid-cols-3">
    <div className="space-y-1.5">
      <Label className="text-xs">City</Label>
      <Input ... className="h-9" />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Province</Label>
      <Select ...>
        <SelectTrigger className="h-9">...</SelectTrigger>
      </Select>
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Postal Code</Label>
      <Input ... className="h-9" />
    </div>
  </div>

  {/* Row 4: Email + Phone + Website + Timezone (4 columns) */}
  <div className="grid gap-3 sm:grid-cols-4">
    <div className="space-y-1.5">
      <Label className="text-xs">Email</Label>
      <Input ... className="h-9" />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Phone</Label>
      <Input ... className="h-9" />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Website</Label>
      <Input ... className="h-9" />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Timezone</Label>
      <Select ...>
        <SelectTrigger className="h-9">...</SelectTrigger>
      </Select>
    </div>
  </div>

  {/* Services Section (only in create mode) - smaller styling */}
  {mode === 'create' && (
    <div className="space-y-2 pt-2 border-t">
      <Label className="text-xs font-medium">Services Offered</Label>
      <p className="text-xs text-muted-foreground">
        Select the types of services this company provides.
      </p>
      {/* Activity chips with smaller badges */}
      ...
    </div>
  )}
</div>
```

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `src/components/layout/AppLayout.tsx` | Adicionar `/companies` e `/business` ao `pathMap` |
| `src/components/layout/TopBar.tsx` | Atualizar `navigationItems` com nomes corretos |
| `src/components/company/EditCompanyModal.tsx` | Aumentar largura, reduzir título, reorganizar campos em 4 colunas |

---

## Resultado Esperado

1. **Abas** - Exibirão "Companies" e "Business" corretamente
2. **Pesquisa** - "Audit & Activity Log" aparecerá como no menu
3. **Modal** - Mais largo, texto menor, menos scroll

