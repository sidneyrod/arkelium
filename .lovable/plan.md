

# Plano: Remover Espaços Vazios e Restaurar Legenda

## 1. Corrigir Espaço Vazio no Header (Direita)

**Arquivo:** `src/pages/Schedule.tsx`

**Problema:** Os grupos de elementos estão com `flex-shrink-0` e não há nada expandindo para preencher o espaço.

**Solução:** Adicionar `flex-1` ao grupo de KPIs para que ele absorva o espaço extra entre navegação e controles:

```tsx
// Linha ~1572 - Alterar de:
<div className="flex items-center gap-1.5 flex-shrink-0">

// Para:
<div className="flex items-center gap-1.5 flex-1 justify-center">
```

Isso centraliza os KPIs e elimina o espaço vazio à direita.

---

## 2. Corrigir Espaço Vazio Inferior (Month View)

**Problema:** A grid do Month View usa altura mínima fixa (`min-h-[85px]`) que não se adapta para preencher a tela.

**Solução:** Fazer o calendário ocupar toda a altura disponível:

```tsx
// Linha ~1659 - Container do calendário
<div className="animate-fade-in flex-1 flex flex-col" key={view}>

// Linha ~1662 - Card do Month View  
<Card className="border-border/40 shadow-soft-sm overflow-hidden flex-1 flex flex-col">
  <CardContent className="p-0 flex-1 flex flex-col">

// Linha ~1671 - Grid das células
<div className="grid grid-cols-7 flex-1">
```

E alterar a classe das células de `min-h-[85px]` para usar altura proporcional:

```tsx
// Remover min-h fixo e deixar a grid flex distribuir
className={cn(
  "p-1 border-r border-b schedule-grid-line last:border-r-0 cursor-pointer transition-all duration-150",
  // ... resto das classes
)}
```

---

## 3. Ajustar Container Principal para Flex Column

**Linha ~1546:**

```tsx
// De:
<div className={cn("p-1 space-y-1", focusMode && "schedule-focus-mode")}>

// Para:
<div className={cn(
  "p-1 space-y-1 h-[calc(100vh-60px)] flex flex-col",
  focusMode && "schedule-focus-mode"
)}>
```

Isso define altura total e permite que os filhos expandam.

---

## 4. Restaurar Legenda Compacta

Adicionar de volta a legenda removida, mas inline e compacta:

```tsx
// Após o container do calendário, antes do Sheet
<div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 py-1">
  <div className="flex items-center gap-1">
    <Sparkles className="h-2.5 w-2.5 text-primary/70" />
    <span>Service</span>
  </div>
  <div className="flex items-center gap-1">
    <Eye className="h-2.5 w-2.5 text-purple-500/70" />
    <span>Visit</span>
  </div>
  <div className="h-2.5 w-px bg-border/40" />
  {Object.entries(statusConfig).map(([status, config]) => (
    <div key={status} className="flex items-center gap-1">
      <div className={cn("h-1.5 w-1.5 rounded-full", config.bgColor.split(' ')[0])} />
      <span>{config.label}</span>
    </div>
  ))}
</div>
```

---

## Resultado Esperado

- Header completamente preenchido sem espaço vazio à direita
- Calendário Month View ocupando 100% da altura disponível
- Legenda restaurada de forma compacta e não invasiva
- Zero espaços desperdiçados na tela

