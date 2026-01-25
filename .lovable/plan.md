

## Plano: Ajustar Layout do Header da Tela Schedule

### Situação Atual
O header do Schedule (linhas 1621-1731) tem a seguinte ordem:
1. Company Filter (w-[160px])
2. Search Bar (max-w-[200px])
3. View Mode Dropdown (w-[90px]) 
4. KPIs
5. Date Navigation
6. Add Job + Focus Mode

### Mudanças Solicitadas

**Arquivo:** `src/pages/Schedule.tsx`

---

### 1. Nova Ordem dos Elementos

Reordenar para:
1. **Search Bar** (primeiro)
2. **Company Filter** (segundo)
3. **View Mode** (terceiro)
4. KPIs, Date Nav, Add Job, Focus Mode (mantém como está)

---

### 2. Aumentar Largura dos Campos

**View Mode Dropdown:**
```tsx
// Antes (linha ~1646)
<SelectTrigger className="w-[90px] h-8 text-xs flex-shrink-0">

// Depois
<SelectTrigger className="w-[120px] h-8 text-xs flex-shrink-0">
```

**Company Filter:**
```tsx
// Antes (linha ~1629)
className="w-[160px] h-8 text-xs flex-shrink-0"

// Depois
className="w-[180px] h-8 text-xs flex-shrink-0"
```

---

### 3. Preencher Linha Toda (Estilo Work & Time Tracking)

Aplicar `flex-1` aos badges KPI para que eles se expandam e preencham todo o espaço disponível.

**Antes (linha ~1664):**
```tsx
<div className="flex items-center gap-1.5 flex-shrink-0">
  <div className="schedule-kpi-pill-inline schedule-kpi-pill-jobs">
    ...
  </div>
</div>
```

**Depois:**
```tsx
<div className="flex items-center gap-2 flex-1">
  <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0 schedule-kpi-pill-jobs">
    <span className="font-semibold text-sm">{summaryStats.total}</span>
    <span className="text-[10px] text-muted-foreground">Jobs</span>
  </div>
  <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0 schedule-kpi-pill-completed">
    <span className="font-semibold text-sm">{summaryStats.completed}</span>
    <span className="text-[10px] text-muted-foreground">Done</span>
  </div>
  <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0 schedule-kpi-pill-inprogress">
    <span className="font-semibold text-sm">{summaryStats.inProgress}</span>
    <span className="text-[10px] text-muted-foreground">In Progress</span>
  </div>
  <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0 schedule-kpi-pill-today">
    <span className="font-semibold text-sm">{summaryStats.todayCount}</span>
    <span className="text-[10px] text-muted-foreground">Today</span>
  </div>
</div>
```

---

### Código Final do Header (Visão Geral)

```tsx
<div className="flex items-center gap-2 w-full">
  {/* 1. Search Bar (primeiro) */}
  <div className="relative min-w-[120px] max-w-[200px]">
    <input ... />
    <Filter className="..." />
  </div>

  {/* 2. Company Filter (segundo) */}
  <CompanyFilter
    className="w-[180px] h-8 text-xs flex-shrink-0"
    ...
  />
  
  {/* 3. View Mode (terceiro, maior) */}
  <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
    <SelectTrigger className="w-[120px] h-8 text-xs flex-shrink-0">
      ...
    </SelectTrigger>
    ...
  </Select>

  {/* 4. KPIs com flex-1 para preencher espaço */}
  <div className="flex items-center gap-2 flex-1">
    <div className="flex-1 flex items-center justify-center ...">
      Jobs: {summaryStats.total}
    </div>
    <div className="flex-1 flex items-center justify-center ...">
      Done: {summaryStats.completed}
    </div>
    <div className="flex-1 flex items-center justify-center ...">
      In Progress: {summaryStats.inProgress}
    </div>
    <div className="flex-1 flex items-center justify-center ...">
      Today: {summaryStats.todayCount}
    </div>
  </div>

  {/* 5. Date Navigation */}
  <div className="flex items-center gap-1 flex-shrink-0">
    ...
  </div>

  {/* 6. Add Job Button */}
  <Button ... />

  {/* 7. Focus Mode Toggle */}
  <Button ... />
</div>
```

---

### Resultado Final

| Elemento | Posição | Largura |
|----------|---------|---------|
| Search Bar | 1º | max-w-[200px] |
| Company Filter | 2º | w-[180px] (aumentado) |
| View Mode | 3º | w-[120px] (aumentado) |
| KPIs | 4º | flex-1 (preenche) |
| Date Nav | 5º | shrink-0 |
| Add Job | 6º | shrink-0 |
| Focus | 7º | shrink-0 |

A linha ficará completamente preenchida como na tela Work & Time Tracking, com os KPIs expandindo proporcionalmente para preencher o espaço disponível.

