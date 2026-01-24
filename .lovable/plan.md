

# Plano: Garantir Visibilidade do Botão "Add Job" no Schedule

## Problema
O botão "Add Job" está posicionado na extrema direita do header (linha 1692-1697) e é cortado quando o sidebar está expandido, mesmo com zoom 80%.

---

## Solução: Mover "Add Job" para o Grupo de Navegação Principal

Reposicionar o botão "Add Job" e "Focus Mode" para ficarem junto com a navegação do calendário (lado esquerdo), garantindo visibilidade total.

---

## Alteração em `src/pages/Schedule.tsx`

### Passo 1: Adicionar `flex-wrap` ao Container Principal (Linha 1542)

**De:**
```tsx
<div className="flex items-center gap-3 min-w-0">
```

**Para:**
```tsx
<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
```

---

### Passo 2: Mover Botões Críticos para o Grupo de Navegação (Linha 1544-1557)

**De:**
```tsx
{/* Calendar Navigation (left) */}
<div className="flex items-center gap-2 flex-shrink-0">
  <Button variant="outline" size="icon" onClick={goToPrevious} className="h-9 w-9">
    <ChevronLeft className="h-4 w-4" />
  </Button>
  <div className="px-3 py-2 rounded-lg bg-card border border-border/50 min-w-[120px] text-center">
    <span className="font-medium text-sm">{format(currentDate, view === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}</span>
  </div>
  <Button variant="outline" size="icon" onClick={goToNext} className="h-9 w-9">
    <ChevronRight className="h-4 w-4" />
  </Button>
  <Button variant="outline" size="sm" className="h-9" onClick={goToToday}>
    {t.schedule.today}
  </Button>
</div>
```

**Para:**
```tsx
{/* Calendar Navigation + Critical Actions (left) */}
<div className="flex items-center gap-2 flex-shrink-0">
  <Button variant="outline" size="icon" onClick={goToPrevious} className="h-9 w-9">
    <ChevronLeft className="h-4 w-4" />
  </Button>
  <div className="px-3 py-2 rounded-lg bg-card border border-border/50 min-w-[120px] text-center">
    <span className="font-medium text-sm">{format(currentDate, view === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}</span>
  </div>
  <Button variant="outline" size="icon" onClick={goToNext} className="h-9 w-9">
    <ChevronRight className="h-4 w-4" />
  </Button>
  <Button variant="outline" size="sm" className="h-9" onClick={goToToday}>
    {t.schedule.today}
  </Button>
  
  {/* Focus Mode - Movido para cá */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setFocusMode(!focusMode)}
          className={cn(
            "h-9 w-9 transition-colors",
            focusMode && "bg-primary/10 text-primary"
          )}
        >
          {focusMode ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Add Job - CRÍTICO: Movido para cá */}
  {isAdminOrManager && (
    <Button onClick={() => setShowAddJob(true)} className="gap-2 h-9">
      <CalendarPlus className="h-4 w-4" />
      {t.schedule.addJob}
    </Button>
  )}
</div>
```

---

### Passo 3: Remover Botões Duplicados da Seção Direita (Linhas 1670-1697)

Remover o bloco do Focus Mode (linhas 1670-1690) e o bloco do Add Job (linhas 1692-1697) da seção de filtros, pois agora estão na navegação principal.

---

## Arquivo a Modificar
`src/pages/Schedule.tsx`

---

## Resultado Esperado

1. **Botão "Add Job" sempre visível** - Posicionado junto à navegação do calendário
2. **Botão "Focus Mode" sempre visível** - Também priorizado no lado esquerdo
3. **KPIs e Filtros podem quebrar linha** - Se não houver espaço, eles vão para uma segunda linha automaticamente
4. **Layout consistente** - Funciona com sidebar expandido ou colapsado em qualquer resolução

