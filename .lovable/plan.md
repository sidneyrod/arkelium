

## Plano: Ajustar Proporções e Espaçamentos do Painel de Branding

### Problema Identificado
O painel esquerdo tem espaçamentos desproporcionais - há uma lacuna visual grande entre o logo e os textos, e os textos não formam um bloco coeso.

### Solução Proposta

**Arquivo:** `src/components/auth/AuthLayout.tsx`

#### 1. Reduzir o tamanho do logo para melhor proporção
```tsx
// Antes
className="h-64 xl:h-72 2xl:h-80 w-auto mb-3 select-none"

// Depois - logo menor e mais elegante
className="h-44 xl:h-48 2xl:h-52 w-auto mb-6 select-none"
```

#### 2. Aumentar levemente a margem entre logo e headline
- Ajustar de `mb-3` para `mb-6` para dar respiro sem criar buraco

#### 3. Reduzir espaço entre headline e subtitle
```tsx
// Antes
<h1 className="... mb-5 ...">

// Depois - mais coeso
<h1 className="... mb-3 ...">
```

#### 4. Reduzir dramaticamente o espaço entre subtitle e trust indicators
```tsx
// Antes
<p className="... mb-10">

// Depois - bloco compacto
<p className="... mb-6">
```

### Resultado Visual Esperado

**Antes:**
```
[    LOGO GRANDE    ]
       (buraco)
  Enterprise Operations
  & Financial Control
       (buraco)
   Operational clarity...
       (buraco grande)
   ○ Audit-ready
   ○ Compliance
   ○ Security
```

**Depois:**
```
  [  LOGO MÉDIO  ]
       (respiro)
  Enterprise Operations
  & Financial Control
  Operational clarity...
       (respiro)
   ○ Audit-ready
   ○ Compliance
   ○ Security
```

### Mudanças Específicas

| Elemento | Antes | Depois |
|----------|-------|--------|
| Logo altura | `h-64 xl:h-72 2xl:h-80` | `h-44 xl:h-48 2xl:h-52` |
| Logo margem inferior | `mb-3` | `mb-6` |
| Headline margem inferior | `mb-5` | `mb-3` |
| Subtitle margem inferior | `mb-10` | `mb-6` |

### Impacto
- Painel esquerdo com hierarquia visual mais elegante
- Elementos formando um bloco coeso e profissional
- Proporcionalidade entre logo e texto melhorada
- Mantém o estilo premium enterprise

