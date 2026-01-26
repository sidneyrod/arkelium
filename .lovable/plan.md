

## Plano: Recalcular Espaçamentos Proporcionais na Área de Branding

### Análise do Problema

Os espaçamentos atuais não estão matematicamente proporcionais aos tamanhos dos elementos:

| Elemento | Altura Aproximada | Margem Atual | Proporção |
|----------|-------------------|--------------|-----------|
| Logo | 320px (h-80) | mb-3 (12px) | 3.75% da altura |
| Headline | ~100px (2 linhas @ 44px) | mb-2 (8px) | 8% da altura |
| Subtitle | ~26px (1 linha) | mb-5 (20px) | 77% da altura |

**Problema:** O espaço de 12px entre uma logo de 320px parece insignificante, mas ainda há muito espaço visual porque o `leading-[1.15]` do headline adiciona espaço interno.

---

### Solução: Escala Tipográfica Proporcional

Usando a **Regra Áurea (1.618)** e proporção inversa:
- Elementos maiores → margens proporcionalmente menores
- Elementos menores → margens proporcionalmente maiores

#### Cálculos Propostos:

**Desktop (lg+):**

| Elemento | Altura | Nova Margem | Cálculo |
|----------|--------|-------------|---------|
| Logo (h-80 = 320px) | 320px | **mb-1** (4px) | Contato visual quase direto |
| Headline | ~100px | **mb-1** (4px) | Unificação com subtitle |
| Subtitle | ~26px | **mb-4** (16px) | Separação para trust indicators |
| Trust Indicators | ~72px | - | Sem margem inferior |

**Total vertical anterior:** 12px + 8px + 20px = **40px** de espaço
**Total vertical novo:** 4px + 4px + 16px = **24px** de espaço (40% redução)

---

### Mudanças Propostas

**Arquivo:** `src/components/auth/AuthLayout.tsx`

#### 1. Logo - Margem Mínima (linha 74)

```tsx
// Antes:
className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-3 select-none"

// Depois:
className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-1 select-none"
```

#### 2. Headline - Margem Compacta (linha 80)

```tsx
// Antes:
className="font-light leading-[1.15] mb-2 text-white"

// Depois - Também reduzir line-height para compactar:
className="font-light leading-[1.05] mb-1 text-white"
```

#### 3. Subtitle - Separação Moderada (linha 93)

```tsx
// Antes:
className="max-w-md text-white/50 mb-5"

// Depois:
className="max-w-md text-white/50 mb-4"
```

---

### Visualização Comparativa

```text
ANTES (40px total)              DEPOIS (24px total)
┌─────────────────┐             ┌─────────────────┐
│                 │             │                 │
│  [LOGO 320px]   │             │  [LOGO 320px]   │
│                 │             │                 │
│     ↕ 12px      │             │     ↕ 4px       │  ← 67% menor
│                 │             │                 │
│   Enterprise    │             │   Enterprise    │
│   Operations    │             │   Operations    │  ← line-height menor
│   & Financial   │             │   & Financial   │
│                 │             │                 │
│     ↕ 8px       │             │     ↕ 4px       │  ← 50% menor
│                 │             │                 │
│  Operational... │             │  Operational... │
│                 │             │                 │
│     ↕ 20px      │             │     ↕ 16px      │  ← 20% menor
│                 │             │                 │
│  ⬡ Audit-ready  │             │  ⬡ Audit-ready  │
│  ⬡ Compliance   │             │  ⬡ Compliance   │
│  ⬡ Enterprise   │             │  ⬡ Enterprise   │
│                 │             │                 │
└─────────────────┘             └─────────────────┘
```

---

### Mobile/Tablet (linha 125)

```tsx
// Antes:
className="h-40 sm:h-48 w-auto mb-2 select-none"

// Depois - Margem zero, texto colado:
className="h-40 sm:h-48 w-auto mb-0.5 select-none"
```

---

### Código Final Desktop (linhas 67-97)

```tsx
{/* Logo - Margem mínima para contato visual */}
<img
  src={arkeliumLogo}
  alt="Arkelium"
  loading="eager"
  decoding="sync"
  fetchPriority="high"
  className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-1 select-none"
  style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
/>

{/* Headline - Line-height compacto e margem mínima */}
<h1
  className="font-light leading-[1.05] mb-1 text-white"
  style={{ 
    fontSize: 'clamp(28px, 3vw, 44px)',
    letterSpacing: '-0.02em'
  }}
>
  Enterprise Operations
  <br />
  <span className="font-normal">&amp; Financial Control</span>
</h1>

{/* Subtitle - Separação moderada para trust indicators */}
<p
  className="max-w-md text-white/50 mb-4"
  style={{ fontSize: 'clamp(13px, 1vw, 16px)', lineHeight: 1.6 }}
>
  Operational clarity, financial accuracy, audit-ready by design.
</p>
```

---

### Resumo das Reduções

| Elemento | Antes | Depois | Redução |
|----------|-------|--------|---------|
| Logo → Headline | 12px | 4px | **-67%** |
| Headline → Subtitle | 8px | 4px | **-50%** |
| Subtitle → Trust | 20px | 16px | **-20%** |
| Headline line-height | 1.15 | 1.05 | Mais compacto |
| **Total espaçamento** | 40px | 24px | **-40%** |

---

### Resultado Esperado

1. Bloco visual **extremamente coeso** - logo e texto parecem uma unidade
2. Hierarquia **proporcional** - espaços calculados matematicamente
3. Zero espaço desperdiçado entre elementos
4. Estética **ultra-premium** e minimalista
5. Trust indicators claramente separados do bloco principal

