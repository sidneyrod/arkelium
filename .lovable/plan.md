

## Plano: Subir Texto "Enterprise Operations" Mais Para Cima

### Mudança Simples

**Arquivo:** `src/components/auth/AuthLayout.tsx`

**Linha 81** - Aumentar margem negativa do headline:

```tsx
// Antes:
className="font-light leading-none -mt-3 mb-1 text-white"

// Depois - Subir mais 4px:
className="font-light leading-none -mt-4 mb-1 text-white"
```

### Comparação Visual

| Valor | Pixels | Efeito |
|-------|--------|--------|
| `-mt-3` (atual) | -12px | Posição atual |
| `-mt-4` (proposto) | -16px | Sobe 4px a mais |
| `-mt-5` (alternativa) | -20px | Sobe 8px a mais |

### Resultado

O texto "Enterprise Operations & Financial Control" ficará 4px mais próximo da logo, criando uma conexão visual ainda mais forte.

