

## Plano: Melhorar a Legibilidade dos Textos de Segurança na Tela de Login

### Problema Identificado

Os textos na seção inferior do formulário de login estão com opacidade muito baixa, tornando-os difíceis de ler:

| Elemento | Opacidade Atual | Classe Atual |
|----------|-----------------|--------------|
| Mensagem de segurança principal | 40% | `text-white/40` |
| Indicadores de confiança | 30% | `text-white/30` |

### Solução Proposta

Aumentar a opacidade dos textos para valores mais legíveis, mantendo o visual elegante e discreto:

**Arquivo:** `src/pages/Login.tsx`

1. **Mensagem de segurança (linha 189)**
   - De: `text-white/40`
   - Para: `text-white/60` (60% de opacidade)

2. **Indicadores de confiança (linha 194)**
   - De: `text-white/30`
   - Para: `text-white/50` (50% de opacidade)

### Código Antes vs Depois

**Antes:**
```tsx
<p className="text-[11px] text-white/40 text-center leading-relaxed">
  {t.securityMsg}
</p>

<div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-white/30">
```

**Depois:**
```tsx
<p className="text-[11px] text-white/60 text-center leading-relaxed">
  {t.securityMsg}
</p>

<div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-white/50">
```

### Resultado Esperado

- Textos visivelmente mais legíveis contra o fundo escuro
- Hierarquia visual mantida (mensagem principal mais clara que os indicadores)
- Estilo discreto e elegante preservado

