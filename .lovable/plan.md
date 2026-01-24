

# Plano: Remover Espaço Vazio na Base do Schedule

## Problema Identificado
O calendário em todos os modos tem valores de `min-height` e offsets de `max-height` excessivos, criando espaço vazio desperdiçado na base.

---

## Correções Necessárias

### 1. Week View (Linha 1877)
**Antes:**
```tsx
<div className="max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto ...">
```

**Depois:**
```tsx
<div className="max-h-[calc(100vh-200px)] overflow-y-auto ...">
```
- Remover `min-h-[400px]` completamente
- Reduzir offset de `320px` para `200px`

---

### 2. Day View (Linha 2188)
**Antes:**
```tsx
style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '500px' }}
```

**Depois:**
```tsx
style={{ maxHeight: 'calc(100vh - 200px)' }}
```
- Remover `minHeight: '500px'` completamente
- Reduzir offset de `280px` para `200px`

---

### 3. Month View (Linha 1724)
**Antes:**
```tsx
"min-h-[90px] p-1.5 border-r border-b ..."
```

**Depois:**
```tsx
"min-h-[75px] p-1.5 border-r border-b ..."
```
- Reduzir altura mínima das células de `90px` para `75px`

---

## Arquivo a Modificar
`src/pages/Schedule.tsx`

---

## Resultado Esperado
- O calendário preenche todo o espaço vertical disponível
- Sem espaço branco desperdiçado na base
- A legenda (Service/Visit/Scheduled/etc.) fica colada na parte inferior do calendário
- Comportamento consistente em Day, Week e Month views

