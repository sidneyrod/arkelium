

## Plano: Ajustar Hierarquia Visual da Área Esquerda do Login

### Problema Identificado

Conforme destacado na imagem, existe um espaço vertical excessivo entre a logo Arkelium e o headline "Enterprise Operations & Financial Control". Isso quebra a coesão visual e não transmite a sofisticação esperada de um design Premium Enterprise SaaS.

**Valores Atuais (linhas 68-76):**
- Logo: `h-64 xl:h-72 2xl:h-80` (256px / 288px / 320px)
- Margem inferior: `mb-6` (24px)

---

### Mudanças Propostas

**Arquivo:** `src/components/auth/AuthLayout.tsx`

---

#### 1. Aumentar Tamanho da Logo (~20%)

| Breakpoint | Antes | Depois | Aumento |
|------------|-------|--------|---------|
| `lg` (base) | `h-64` (256px) | `h-80` (320px) | +25% |
| `xl` | `h-72` (288px) | `h-[340px]` | +18% |
| `2xl` | `h-80` (320px) | `h-96` (384px) | +20% |

**Código:**
```tsx
// Antes (linha 74):
className="h-64 xl:h-72 2xl:h-80 w-auto mb-6 select-none"

// Depois:
className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-3 select-none"
```

---

#### 2. Reduzir Espaçamento entre Logo e Headline

**Antes:** `mb-6` (24px) na logo
**Depois:** `mb-3` (12px) - redução de 50%

Isso elimina a área vazia destacada na imagem e cria um bloco visual coeso.

---

#### 3. Ajustar Espaçamento do Headline para Subheadline

Para manter proporção e hierarquia, ajustar também o espaço após o headline:

**Antes (linha 80):** `mb-3` (12px)
**Depois:** `mb-2` (8px)

---

#### 4. Ajustar Espaçamento do Subtitle para Trust Indicators

**Antes (linha 93):** `mb-6` (24px)
**Depois:** `mb-5` (20px)

---

### Resumo Visual das Mudanças

```text
┌─────────────────────────────────────────┐
│                                         │
│            [ARKELIUM LOGO]              │  ← +20% maior
│               ↕ 12px                    │  ← Era 24px
│      Enterprise Operations              │
│       & Financial Control               │
│               ↕ 8px                     │  ← Era 12px
│   Operational clarity, financial...     │
│               ↕ 20px                    │  ← Era 24px
│   ⬡ Audit-ready architecture           │
│   ⬡ Compliance-driven by default       │
│   ⬡ Enterprise-grade security          │
│                                         │
└─────────────────────────────────────────┘
```

---

### Código Final (Desktop - Linhas 66-113)

```tsx
{/* Brand Content - Centered with Large Logo */}
<div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto w-full">
  {/* Logo - Gold, Large, Centered - 20% larger */}
  <img
    src={arkeliumLogo}
    alt="Arkelium"
    loading="eager"
    decoding="sync"
    fetchPriority="high"
    className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-3 select-none"
    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
  />

  {/* Headline - Tighter spacing to logo */}
  <h1
    className="font-light leading-[1.15] mb-2 text-white"
    style={{ 
      fontSize: 'clamp(28px, 3vw, 44px)',
      letterSpacing: '-0.02em'
    }}
  >
    Enterprise Operations
    <br />
    <span className="font-normal">&amp; Financial Control</span>
  </h1>
  
  {/* Subtitle - Adjusted spacing */}
  <p
    className="max-w-md text-white/50 mb-5"
    style={{ fontSize: 'clamp(13px, 1vw, 16px)', lineHeight: 1.6 }}
  >
    Operational clarity, financial accuracy, audit-ready by design.
  </p>

  {/* Trust Indicators - unchanged */}
  <div className="flex flex-col gap-3">
    ...
  </div>
</div>
```

---

### Mobile/Tablet (Linhas 118-131)

Proporcionalizar ajustes para telas menores:

```tsx
// Antes (linha 125):
className="h-32 sm:h-40 w-auto mb-4 select-none"

// Depois - ~20% maior e espaçamento reduzido:
className="h-40 sm:h-48 w-auto mb-2 select-none"
```

---

### Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/auth/AuthLayout.tsx` | Aumentar logo, reduzir espaçamentos |

---

### Resultado Esperado

1. Logo Arkelium ~20% maior - maior presença institucional
2. Espaço entre logo e headline reduzido pela metade - bloco visual coeso
3. Hierarquia clara: Logo → Headline → Subheadline → Trust Indicators
4. Sem áreas vazias sem propósito visual
5. Estética premium, enterprise e minimalista preservada

