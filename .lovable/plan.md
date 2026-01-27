
## Plano: Ajustar Posição das Legendas no Revenue Trend

### Problema Identificado

| Propriedade | Valor Atual | Problema |
|-------------|-------------|----------|
| `Legend height` | 36px (linha 98) | Espaço insuficiente para centralizar |
| `LineChart margin.bottom` | 0px (linha 73) | Legenda colada no eixo X |

---

### Solução

Aumentar a margem inferior do gráfico e a altura reservada para a legenda, criando espaço branco adequado para centralizar os itens "Revenue" e "Forecast".

**Mudanças no arquivo `src/components/dashboard/RevenueTrendChart.tsx`:**

| Linha | Antes | Depois |
|-------|-------|--------|
| 73 | `margin={{ top: 10, right: 10, left: 0, bottom: 0 }}` | `margin={{ top: 10, right: 10, left: 0, bottom: 20 }}` |
| 98 | `height={36}` | `height={48}` |

---

### Código da Mudança

```tsx
// Linha 73 - Adicionar margem inferior
<LineChart
  data={data}
  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}  // bottom: 0 → 20
>

// Linha 98 - Aumentar altura da legenda
<Legend
  verticalAlign="bottom"
  height={48}  // 36 → 48
  iconType="circle"
  iconSize={8}
  formatter={(value) => (
    <span className="text-xs text-muted-foreground ml-1">{value}</span>
  )}
/>
```

---

### Resultado Visual Esperado

```text
┌─────────────────────────────────────────┐
│           [Gráfico de Linhas]           │
│                                         │
├─────────────────────────────────────────┤
│  Aug   Sep   Oct   Nov   Dec   Jan      │  ← Eixo X
│                                         │
│         ● Revenue    ● Forecast         │  ← Legendas centralizadas
│                                         │
└─────────────────────────────────────────┘
```

---

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/RevenueTrendChart.tsx` | Aumentar `margin.bottom` de 0 para 20, e `Legend height` de 36 para 48 |
