
## Plano: Corrigir Layout da Tela "Work & Time Tracking"

### Problemas Identificados na Imagem

| Problema | Causa | Impacto |
|----------|-------|---------|
| Valores de KPI fora dos campos ("Revenue $2,320", "Collected $590", etc.) | Cards com `flex-1` sem largura mínima adequada; valores muito grandes para o espaço | Texto sobrepõe outros elementos |
| Botão "Export Report" parcialmente cortado | Row única sem `flex-wrap` ou scroll; ações à direita são comprimidas | Funcionalidade parcialmente oculta |
| Layout quebra com sidebar aberta/fechada | Larguras fixas não se adaptam ao espaço disponível | Experiência inconsistente |

---

## Estratégia de Correção

### Arquitetura do Layout Responsivo

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LINHA 1 (flex + gap-2 + overflow-x-auto)                                       │
│  ┌──────────┐ ┌──────────────┐ ┌───────────────────────────────────────────────┐│
│  │Search    │ │CompanyFilter │ │ KPIs (flex-shrink-0 + horizontal scroll)     ││
│  │(160px)   │ │(160px)       │ │ [Jobs] [Hours] [Revenue] [+Cash if enabled]  ││
│  └──────────┘ └──────────────┘ └───────────────────────────────────────────────┘│
│                                                                                 │
│  LINHA 2 (flex + justify-end)                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────────┐
│  │                                  [Date Picker] [Refresh] [Export Report]    ││
│  └──────────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Abordagem Técnica

1. **Dividir em 2 linhas** - Separar KPIs e filtros (linha 1) das ações (linha 2)
2. **KPIs com scroll horizontal** - Quando espaço é insuficiente, permitir scroll em vez de comprimir
3. **Larguras fixas para controles** - Search, CompanyFilter, DatePicker com tamanhos definidos
4. **Valores com truncate** - Garantir que valores longos não quebrem o layout

---

## Mudanças em `src/pages/WorkEarningsSummary.tsx`

### 1. Reestruturar Header em 2 Linhas

**Antes (linha única que transborda):**
```tsx
<div className="flex items-center gap-2">
  {/* Search + CompanyFilter + KPIs + Actions - tudo em uma linha */}
</div>
```

**Depois (duas linhas com melhor distribuição):**
```tsx
<div className="space-y-2">
  {/* Linha 1: Filtros + KPIs com scroll horizontal */}
  <div className="flex items-center gap-2 overflow-x-auto">
    {/* Search com largura fixa */}
    <SearchInput className="w-[160px] flex-shrink-0 h-8" />
    
    {/* CompanyFilter com largura fixa */}
    <CompanyFilter className="w-[160px] flex-shrink-0 h-8" />

    {/* KPIs com scroll horizontal */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Cada KPI com min-width para não colapsar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md whitespace-nowrap">
        ...
      </div>
    </div>
  </div>

  {/* Linha 2: Ações à direita */}
  <div className="flex items-center justify-end gap-2">
    <DatePickerDialog ... />
    <Button ...>Refresh</Button>
    <ExportReportButton ... />
  </div>
</div>
```

---

### 2. Ajustes nos KPIs Individuais

**Antes:**
```tsx
<div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
  <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
  <span className="text-[10px] text-muted-foreground">Revenue</span>
  <span className="font-semibold text-sm">${globalSummary.totalGrossServiceRevenue.toLocaleString()}</span>
</div>
```

**Depois (sem flex-1, com whitespace-nowrap):**
```tsx
<div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border rounded-md whitespace-nowrap">
  <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
  <span className="text-[10px] text-muted-foreground">Revenue</span>
  <span className="font-semibold text-sm">${globalSummary.totalGrossServiceRevenue.toLocaleString()}</span>
</div>
```

**Mudanças-chave:**
- Remover `flex-1` - cada KPI ocupa apenas o espaço necessário
- Adicionar `whitespace-nowrap` - valores não quebram linha
- Remover `min-w-0` - permite que o KPI tenha largura natural
- Padding ligeiramente maior (`px-3`) para melhor legibilidade

---

### 3. Larguras Fixas para Elementos de Controle

| Elemento | Antes | Depois |
|----------|-------|--------|
| SearchInput | `min-w-[120px] max-w-[200px]` | `w-[160px] flex-shrink-0` |
| CompanyFilter | `w-[180px]` | `w-[160px] flex-shrink-0` |
| DatePickerDialog | `w-auto` | `w-auto flex-shrink-0` |

---

### 4. Container com Overflow Horizontal

Adicionar `overflow-x-auto` na primeira linha para permitir scroll quando a tela for muito estreita:

```tsx
<div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
```

---

## Configuração Cash (enableCashKept)

### Quando `enableCashKept = true` (Admin com cash handling)
- Exibir 6 KPIs: Jobs, Hours, Revenue, Collected, Kept, To Office
- A linha de KPIs pode ficar mais larga, mas com scroll horizontal disponível

### Quando `enableCashKept = false` (Cleaner ou cash desabilitado)
- Exibir apenas 3 KPIs: Jobs, Hours, Revenue
- Linha mais compacta, provavelmente sem necessidade de scroll

A lógica condicional já existe no código e será mantida:
```tsx
{enableCashKept && (
  <>
    <div>Collected...</div>
    <div>Kept...</div>
    <div>To Office...</div>
  </>
)}
```

---

## Comportamento com Sidebar Aberta/Fechada

| Estado Sidebar | Largura Disponível | Comportamento |
|----------------|-------------------|---------------|
| **Aberta** (~200px) | Menor | KPIs com scroll horizontal se necessário |
| **Fechada** (~60px) | Maior | Todos os elementos visíveis sem scroll |

O uso de `overflow-x-auto` no container de KPIs garante que nenhum elemento seja cortado em nenhum dos estados.

---

## Resultado Visual Esperado

### Antes (Problemático)
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [🔍Search] [🏢All Companies▼] [Jobs 10] [Hours 18.0h] [Revenue $2,32│CUT│
│                                                                    Export│
└──────────────────────────────────────────────────────────────────────────┘
```

### Depois (Corrigido)
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [🔍Search] [🏢All Companies▼] [Jobs 10] [Hours 18.0h] [Revenue $2,320]  │
│   (← scroll if needed →)     [Collected $590] [Kept $0] [To Office $390]│
├──────────────────────────────────────────────────────────────────────────┤
│                              [📅 Dec 31-Jan 29] [⟳ Refresh] [↓ Export]  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/WorkEarningsSummary.tsx` | Reorganizar header em 2 linhas; ajustar KPIs com `whitespace-nowrap`; adicionar `overflow-x-auto`; usar larguras fixas |

---

## Checklist de Qualidade

- [ ] Valores de KPI ficam dentro dos campos
- [ ] Botão "Export Report" sempre visível
- [ ] Layout funciona com sidebar aberta E fechada
- [ ] Scroll horizontal disponível quando necessário
- [ ] Configuração cash (enableCashKept) corretamente oculta/exibe KPIs extras
- [ ] Aparência Premium Enterprise mantida (espaçamentos, cores, tipografia)
