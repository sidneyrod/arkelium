
## Plano: Correções do Tema Dark no Dashboard

### Problemas Identificados

Analisando a imagem do Dashboard no modo Dark, encontrei os seguintes problemas:

| Problema | Localização | Causa |
|----------|-------------|-------|
| **Fundo do Dashboard com cor clara fixa** | `Dashboard.tsx` linha 435 | Usa `bg-[hsl(220_20%_98%)]` (branco) ao invés de `bg-background` |
| **Título "Dashboard" muito claro** | `Dashboard.tsx` linha 438 | Atualmente usa `text-foreground`, que deveria funcionar - o problema é o fundo claro fazendo contraste ruim |
| **Cards com bordas pouco visíveis** | `KPICard.tsx`, `AttentionCard.tsx` | `border-border/50` e `border-border/40` podem precisar de ajuste no dark |

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Linha 435: Mudar fundo para variável CSS adaptativa |

---

### Correção Principal

**Linha 435 de `Dashboard.tsx`:**

```tsx
// ANTES (cor fixa que não adapta ao dark mode):
<div className="p-4 space-y-4 bg-[hsl(220_20%_98%)] min-h-screen">

// DEPOIS (usa variável CSS que adapta automaticamente):
<div className="p-4 space-y-4 bg-background min-h-screen">
```

**Explicação:**
- `bg-[hsl(220_20%_98%)]` é uma cor hardcoded clara (off-white)
- `bg-background` usa `--background` que está definida em `index.css`:
  - **Light:** `220 20% 98%` (off-white)
  - **Dark:** `230 20% 8%` (dark navy)

Essa simples mudança fará com que o fundo se adapte corretamente ao tema.

---

### Verificação Adicional

Os demais componentes já usam variáveis CSS corretas:
- `KPICard`: usa `bg-card` ✓
- `AttentionCard`: usa `bg-card` ✓
- `RevenueTrendChart`: usa `Card` component ✓
- `OperationalDonut`: usa `Card` component ✓

O único problema real é a cor de fundo fixa no container principal do Dashboard Admin.

---

### Resultado Esperado

Após a correção:
- **Tema Light:** Fundo off-white (`220 20% 98%`) - mesmo visual atual
- **Tema Dark:** Fundo dark navy (`230 20% 8%`) - correto para dark mode
- Cards e gráficos se destacarão corretamente contra o fundo escuro
