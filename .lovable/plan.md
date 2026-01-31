

## Plano: Consolidar Layout do "Work & Time Tracking" em Linha Única

### Problema Identificado

| Problema | Causa | Local |
|----------|-------|-------|
| Elementos em 2 linhas (KPIs na linha 1, ações na linha 2) | `space-y-2` separando os containers | Linhas 116-203 |
| Date Picker não aparece na mesma linha | Está no segundo `<div>` (linha 182) | Linha 183-189 |
| Usuário quer **sem scroll** e **linha única** | Layout precisa ser mais compacto | Todo o header |

---

## Estratégia de Solução

Para caber tudo em uma única linha SEM scroll, precisamos:

1. **Unificar em uma única linha** - Remover a estrutura `space-y-2` com dois divs
2. **Compactar elementos** - Reduzir larguras e espaçamentos
3. **Usar `flex-wrap`** - Permitir quebra natural apenas se necessário (não scroll)
4. **Reduzir tamanhos dos KPIs** - Menos padding, fonte menor

---

## Mudanças em `src/pages/WorkEarningsSummary.tsx`

### Nova Estrutura do Header (Linha Única)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🔍] [🏢Filter▼] [Jobs 10] [⏱18.0h] [📈$2,320] [💵$590] [$0] [✓$390] [📅Jan 1-31▼] [⟳] [↓Export] │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Código Proposto

```tsx
{/* Header: Single line with all elements */}
<div className="flex items-center gap-1.5 flex-wrap">
  {/* Search Input - compact */}
  <SearchInput
    placeholder="Search..."
    value={search}
    onChange={setSearch}
    className="w-[130px] h-8"
  />
  
  {/* Company Filter - compact */}
  <CompanyFilter
    value={selectedCompanyId}
    onChange={setSelectedCompanyId}
    showAllOption={accessibleCompanies.length > 1}
    allLabel="All Companies"
    className="w-[140px] h-8 text-xs"
  />

  {/* KPIs - compact badges */}
  <div className="flex items-center gap-1">
    <div className="flex items-center gap-1 px-2 py-1 bg-card border rounded text-xs whitespace-nowrap">
      <Briefcase className="h-3 w-3 text-primary" />
      <span className="font-semibold">{globalSummary.totalJobsCompleted}</span>
    </div>
    
    <div className="flex items-center gap-1 px-2 py-1 bg-card border rounded text-xs whitespace-nowrap">
      <Clock className="h-3 w-3 text-blue-500" />
      <span className="font-semibold">{globalSummary.totalHoursWorked.toFixed(1)}h</span>
    </div>
    
    <div className="flex items-center gap-1 px-2 py-1 bg-card border rounded text-xs whitespace-nowrap">
      <TrendingUp className="h-3 w-3 text-green-500" />
      <span className="font-semibold">${globalSummary.totalGrossServiceRevenue.toLocaleString()}</span>
    </div>
    
    {/* Cash KPIs - conditional */}
    {enableCashKept && (
      <>
        <div className="flex items-center gap-1 px-2 py-1 bg-card border rounded text-xs whitespace-nowrap">
          <Banknote className="h-3 w-3 text-amber-500" />
          <span className="font-semibold">${globalSummary.totalCashCollected.toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 bg-card border rounded text-xs whitespace-nowrap">
          <DollarSign className="h-3 w-3 text-purple-500" />
          <span className="font-semibold">${globalSummary.cashKeptApproved.toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 bg-card border rounded text-xs whitespace-nowrap">
          <CheckCircle className="h-3 w-3 text-emerald-500" />
          <span className="font-semibold">${globalSummary.cashDeliveredToOffice.toLocaleString()}</span>
        </div>
      </>
    )}
  </div>

  {/* Spacer to push actions to right */}
  <div className="flex-1" />

  {/* Date Picker - RESTORED */}
  <DatePickerDialog
    mode="range"
    selected={dateRange}
    onSelect={handleDateRangeSelect}
    dateFormat="MMM d"
    className="text-xs h-8 w-auto"
  />

  {/* Refresh Button - icon only */}
  <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchData}>
    <RefreshCw className="h-3.5 w-3.5" />
  </Button>

  {/* Export Report Button */}
  <ExportReportButton
    period={period}
    globalSummary={globalSummary}
    getExportData={getExportData}
    enableCashKept={enableCashKept}
  />
</div>
```

---

## Otimizações Aplicadas

| Elemento | Antes | Depois | Economia |
|----------|-------|--------|----------|
| SearchInput | `w-[160px]` | `w-[130px]` | -30px |
| CompanyFilter | `w-[160px]` | `w-[140px]` | -20px |
| KPI gaps | `gap-2` | `gap-1` | -6px/KPI |
| KPI padding | `px-3 py-1.5` | `px-2 py-1` | -8px/KPI |
| KPI labels | `text-[10px]` label + value | Remover labels, só valores | -40px+ |
| Refresh button | `gap-2` + texto | Icon only | -60px |
| DatePicker format | `MMM d, yyyy` | `MMM d` | -8px |

---

## Resultado Visual Esperado

### Com Cash Enabled (Admin)
```text
[🔍Search] [🏢All▼] [📊10] [⏱18.0h] [📈$2,320] [💵$590] [$0] [✓$390]  [📅Jan 1-31▼] [⟳] [↓Export]
```

### Sem Cash (Cleaner View)
```text
[🔍Search] [🏢All Companies▼] [📊 10] [⏱ 18.0h] [📈 $2,320]            [📅Jan 1-31▼] [⟳] [↓Export]
```

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/WorkEarningsSummary.tsx` | Consolidar header em linha única; remover labels dos KPIs; usar icon-only no Refresh; restaurar DatePicker na mesma linha |

