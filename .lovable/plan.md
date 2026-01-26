

## Plano: Ajustes Visuais para Corresponder à Imagem de Referência

### Análise das Diferenças

Comparando a **imagem de referência** (primeira) com a **implementação atual** (segunda):

| Elemento | Referência | Atual | Correção |
|----------|------------|-------|----------|
| AttentionCard Layout | Horizontal: Ícone+Título à esquerda, Valor à direita | Centralizado verticalmente | Redesenhar layout |
| Ícone Pending Invoices | Ícone azul (cartão/documento) | Ícone amarelo | Mudar para `FileText` azul |
| Botão "Bill Now" | Sólido dourado | Outline dourado | Mudar para `ctaVariant="gold"` |

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/AttentionCard.tsx` | Layout horizontal conforme referência |
| `src/pages/Dashboard.tsx` | Ajustar ícones e variantes dos botões |

---

### 1. AttentionCard.tsx - Novo Layout Horizontal

**Estrutura visual da referência:**
```
┌────────────────────────────────────────┐
│ 🕐 Delayed Jobs                      2 │
│              [ Review ]                │
└────────────────────────────────────────┘
```

**Código atualizado:**
```tsx
const AttentionCard = ({
  icon: Icon,
  iconColor = 'text-warning',
  title,
  value,
  ctaLabel,
  ctaVariant = 'gold-outline',
  onClick,
}: AttentionCardProps) => {
  const ctaStyles = {
    gold: 'bg-[#C9A84B] hover:bg-[#B8993E] text-white border-[#C9A84B]',
    'gold-outline': 'border-[#C9A84B] text-[#C9A84B] hover:bg-[#C9A84B]/10',
    'red-outline': 'border-destructive text-destructive hover:bg-destructive/10',
  };

  return (
    <div className="bg-card rounded-xl border border-border/40 p-4 space-y-4">
      {/* Top Row: Icon+Title (left) | Value (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconColor)} />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>

      {/* CTA Button - Centered */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className={cn('min-w-[100px]', ctaStyles[ctaVariant])}
          onClick={onClick}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
};
```

---

### 2. Dashboard.tsx - Ajustes de Ícones e Variantes

**Linha 494-520** - Seção "Attention Required":

```tsx
{/* Attention Required Section */}
<div className="space-y-3">
  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
    Attention Required
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Delayed Jobs - Ícone âmbar (correto) */}
    <AttentionCard
      icon={Clock}
      iconColor="text-amber-500"
      title="Delayed Jobs"
      value={alertStats.delayedJobs}
      ctaLabel="Review"
      ctaVariant="gold-outline"
      onClick={handleDelayedJobsClick}
    />
    
    {/* Pending Invoices - Ícone AZUL + Botão SÓLIDO dourado */}
    <AttentionCard
      icon={FileText}
      iconColor="text-blue-500"
      title="Pending Invoices"
      value={`$${alertStats.pendingInvoicesAmount.toLocaleString()}`}
      ctaLabel="Bill Now"
      ctaVariant="gold"  // Sólido, não outline
      onClick={handlePendingInvoicesClick}
    />
    
    {/* Schedule Conflicts - Ícone vermelho */}
    <AttentionCard
      icon={AlertTriangle}
      iconColor="text-destructive"
      title="Schedule Conflicts"
      value={alertStats.scheduleConflicts}
      ctaLabel="Resolve"
      ctaVariant="red-outline"
    />
  </div>
</div>
```

---

### Comparação Visual

**Antes (layout centralizado):**
```
┌────────────────────────┐
│   🕐 Delayed Jobs      │
│          2             │
│      [ Review ]        │
└────────────────────────┘
```

**Depois (layout horizontal conforme referência):**
```
┌────────────────────────────┐
│ 🕐 Delayed Jobs          2 │
│        [ Review ]          │
└────────────────────────────┘
```

---

### Resumo de Mudanças

| Arquivo | Linhas | Tipo |
|---------|--------|------|
| `src/components/dashboard/AttentionCard.tsx` | 30-50 | Layout horizontal |
| `src/pages/Dashboard.tsx` | 494-520 | Ícones e variantes |

---

### Resultado Esperado

Após essas mudanças, o Dashboard Admin terá:
1. **Attention Cards** com layout horizontal idêntico à referência
2. **Pending Invoices** com ícone azul e botão sólido dourado
3. **Delayed Jobs** com ícone âmbar
4. **Schedule Conflicts** com ícone vermelho

