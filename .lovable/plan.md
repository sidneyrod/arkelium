

# Plano: Ajustar Zoom Global para 80%

## Alteração Única

**Arquivo:** `src/components/layout/AppLayout.tsx`

**Linha 127 - Alterar zoom de 0.85 para 0.80:**

```tsx
// De:
<div className="min-h-[calc(100vh/0.85)] bg-background flex w-full" style={{ zoom: 0.85 }}>

// Para:
<div className="min-h-[calc(100vh/0.80)] bg-background flex w-full" style={{ zoom: 0.80 }}>
```

---

## Ajuste Complementar no Sidebar

**Arquivo:** `src/components/layout/Sidebar.tsx`

**Linha 240 - Atualizar cálculo de altura:**

```tsx
// De:
style={{ height: 'calc(100vh / 0.85)' }}

// Para:
style={{ height: 'calc(100vh / 0.80)' }}
```

---

## Resultado

- Todos os botões do Schedule (Add Job, Focus Mode, filtros) ficarão visíveis
- A mudança é automática para todos os usuários
- Layout consistente em todas as resoluções de tela
- Mantém a estética de alta densidade enterprise

