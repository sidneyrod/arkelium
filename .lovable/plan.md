

## Plano: Eliminar Espaço Visual Completamente (Margem Negativa)

### Análise Técnica do Problema

O espaço visual persistente vem de **duas fontes ocultas**:

1. **Logo Arkelium**: O arquivo PNG provavelmente tem padding transparente interno
2. **Headline line-height**: Mesmo com `leading-[1.05]`, ainda há espaço de entrelinha

**Cálculo atual:**
- `mb-1` = 4px de margem CSS
- Mas visualmente parece ~20-30px devido ao espaço interno dos elementos

### Solução: Margem Negativa + Leading Tight

Para "colar" os elementos visualmente, precisamos usar **margem negativa** no headline para compensar o espaço interno da logo.

---

### Mudanças Propostas

**Arquivo:** `src/components/auth/AuthLayout.tsx`

#### 1. Logo - Remover margem completamente (linha 74)

```tsx
// Antes:
className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-1 select-none"

// Depois - Zero margem:
className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-0 select-none"
```

#### 2. Headline - Margem negativa para compensar (linha 80)

```tsx
// Antes:
className="font-light leading-[1.05] mb-1 text-white"

// Depois - Margem superior negativa para "subir" o texto:
className="font-light leading-none -mt-2 mb-1 text-white"
```

**Explicação:**
- `leading-none` = `line-height: 1` (zero espaço extra)
- `-mt-2` = margem superior negativa de 8px, puxando o texto para cima

#### 3. Se necessário ainda mais ajuste, usar -mt-3 ou -mt-4

```tsx
// Versão mais agressiva:
className="font-light leading-none -mt-4 mb-1 text-white"
```

---

### Cálculo Proporcional Detalhado

| Elemento | Altura Real | Espaço Interno Estimado | Compensação |
|----------|-------------|-------------------------|-------------|
| Logo (h-80) | 320px | ~10-15px de padding inferior no PNG | mb-0 |
| Headline | ~92px (44px × 2 linhas × 1.05) | ~8px de leading | -mt-2 a -mt-4 |
| Subtítulo | ~26px | ~4px de leading | Manter mb-4 |

**Resultado esperado:** O texto "Enterprise Operations" ficará praticamente colado na logo, com apenas o espaço natural do design tipográfico.

---

### Código Final (linhas 67-97)

```tsx
{/* Logo - Zero margem, o espaço vem do PNG */}
<img
  src={arkeliumLogo}
  alt="Arkelium"
  loading="eager"
  decoding="sync"
  fetchPriority="high"
  className="h-80 xl:h-[340px] 2xl:h-96 w-auto mb-0 select-none"
  style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
/>

{/* Headline - Margem negativa para colar na logo */}
<h1
  className="font-light leading-none -mt-3 mb-1 text-white"
  style={{ 
    fontSize: 'clamp(28px, 3vw, 44px)',
    letterSpacing: '-0.02em'
  }}
>
  Enterprise Operations
  <br />
  <span className="font-normal">&amp; Financial Control</span>
</h1>

{/* Subtitle - Espaçamento moderado */}
<p
  className="max-w-md text-white/50 mt-0.5 mb-4"
  style={{ fontSize: 'clamp(13px, 1vw, 16px)', lineHeight: 1.5 }}
>
  Operational clarity, financial accuracy, audit-ready by design.
</p>
```

---

### Mobile/Tablet (linha 125)

```tsx
// Antes:
className="h-40 sm:h-48 w-auto mb-0.5 select-none"

// Depois - Zero margem:
className="h-40 sm:h-48 w-auto mb-0 select-none"

// E o texto abaixo com margem negativa:
<p className="text-xs sm:text-sm text-center max-w-[280px] text-white/50 -mt-1">
```

---

### Resumo das Mudanças

| Elemento | Antes | Depois | Efeito |
|----------|-------|--------|--------|
| Logo margin-bottom | mb-1 (4px) | mb-0 (0px) | Elimina espaço CSS |
| Headline margin-top | 0 | -mt-3 (-12px) | Puxa texto para cima |
| Headline line-height | leading-[1.05] | leading-none | Remove entrelinha extra |
| Subtitle line-height | 1.6 | 1.5 | Levemente mais compacto |

---

### Resultado Esperado

1. Logo e headline formam **bloco visual único** sem gap perceptível
2. Texto parece "sair" da logo naturalmente
3. Hierarquia visual premium mantida
4. Estética ultra-coesa e institucional

