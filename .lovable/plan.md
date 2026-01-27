

## Plano: Correção da Aba Padrão no Company Profile

### Problema Identificado

| Localização | Código Atual | Problema |
|-------------|--------------|----------|
| `src/pages/Company.tsx` linha 77 | `searchParams.get('tab') \|\| 'branding'` | Fallback padrão é `'branding'` ao invés de `'profile'` |

---

### Solução

Modificar a linha 77 para usar `'profile'` como aba padrão:

**Antes:**
```tsx
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'branding');
```

**Depois:**
```tsx
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
```

---

### Comportamento Esperado

| Cenário | URL | Aba que Abre |
|---------|-----|--------------|
| **Acesso direto** | `/company` | Profile ✓ |
| **Do Dashboard (popup)** | `/company?tab=preferences` | Preferences ✓ |
| **Acesso manual a Branding** | `/company?tab=branding` | Branding ✓ |

---

### Arquivo a Modificar

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/pages/Company.tsx` | 77 | Trocar `'branding'` por `'profile'` no fallback do estado inicial |

