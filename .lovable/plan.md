

## Plano: Otimizar Espaço Vertical no Focus Mode da Schedule

### Problema Identificado
Quando o Focus Mode está ativo, a Schedule não está aproveitando todo o espaço vertical disponível:
1. A legenda (Service, Visit, Scheduled, In Progress, Completed, Cancelled) na base ocupa espaço vertical
2. O container principal mantém o offset de 20px mesmo no Focus Mode
3. O scroll-area das views (Week/Day) usa 80px de offset fora do Focus Mode e apenas 40px no Focus Mode - poderia ser ainda menor

### Mudanças Propostas

**Arquivo:** `src/pages/Schedule.tsx`

---

### 1. Ajustar Altura do Container Principal no Focus Mode

**Antes (linha 1616):**
```tsx
"p-1 space-y-1 h-[calc(100vh/0.80-20px)] flex flex-col"
```

**Depois:**
```tsx
cn(
  "p-1 space-y-1 flex flex-col",
  focusMode 
    ? "h-[calc(100vh/0.80-8px)]"  // Menos offset no Focus Mode
    : "h-[calc(100vh/0.80-20px)]"
)
```

---

### 2. Ocultar ou Minimizar a Legenda no Focus Mode

A legenda ocupa ~20px de altura na base. No Focus Mode, podemos ocultá-la para maximizar o espaço do calendário.

**Antes (linhas 2615-2632):**
```tsx
{/* Compact Status Legend */}
<div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 py-0.5 px-1 flex-shrink-0">
  ...
</div>
```

**Depois:**
```tsx
{/* Compact Status Legend - Hidden in Focus Mode */}
{!focusMode && (
  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 py-0.5 px-1 flex-shrink-0">
    ...
  </div>
)}
```

---

### 3. Reduzir Offset do Scroll-Area no Focus Mode

**Week View (linha 1910):**
```tsx
// Antes
focusMode ? "max-h-[calc(100vh-40px)]" : "max-h-[calc(100vh-80px)]"

// Depois (menos offset no Focus Mode)
focusMode ? "max-h-[calc(100vh-24px)]" : "max-h-[calc(100vh-80px)]"
```

**Day View (linha 2221):**
```tsx
// Antes
style={{ maxHeight: focusMode ? 'calc(100vh - 40px)' : 'calc(100vh - 80px)' }}

// Depois
style={{ maxHeight: focusMode ? 'calc(100vh - 24px)' : 'calc(100vh - 80px)' }}
```

---

### Resumo das Mudanças

| Elemento | Modo Normal | Focus Mode |
|----------|-------------|------------|
| Container height offset | -20px | -8px (reduzido) |
| Legenda na base | Visível | **Oculta** |
| Scroll-area max-height offset | -80px | -24px (reduzido de -40px) |

---

### Resultado Esperado

- No Focus Mode, a Schedule ocupará praticamente todo o espaço vertical da tela
- A legenda desaparecerá para maximizar a área útil do calendário
- Os resquícios de espaço vazio na base serão eliminados
- O usuário terá uma experiência de visualização totalmente imersiva

