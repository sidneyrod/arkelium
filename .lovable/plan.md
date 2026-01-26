
## Plano: Correção da Lógica de Role para Super-Admins

### Diagnóstico do Problema

**Causa Raiz Identificada**: A função `hasRole()` no `AuthContext.tsx` tem um bug de lógica para Super-Admins.

```tsx
// AuthContext.tsx - Linha 237-241
const hasRole = (roles: UserRole[]): boolean => {
  if (user?.isSuperAdmin) return true;  // ← RETORNA TRUE PARA QUALQUER ROLE!
  if (!user?.role) return false;
  return roles.includes(user.role);
};
```

**Consequência**: Para a Eliana (que é `is_super_admin: true`):
- `hasRole(['admin'])` = `true` ✓
- `hasRole(['manager'])` = `true` ✓
- `hasRole(['cleaner'])` = `true` ← **INCORRETO!**

**Fluxo do Bug no Dashboard**:
```
useRoleAccess() → isCleaner = hasRole(['cleaner']) → TRUE (incorreto)
                → isAdminOrManager = hasRole(['admin', 'manager']) → TRUE (correto)

Dashboard.tsx linha 342: if (isCleaner) → renderiza Cleaner Dashboard ❌
```

---

### Dados da Eliana (Confirmados no Banco)

| Campo | Valor |
|-------|-------|
| `email` | eliana.guilher@hotmail.com |
| `is_super_admin` | `true` |
| `role` | `admin` |
| `role_status` | `active` |
| `profile_company_id` | a1b2c3d4-e5f6-7890-abcd-ef1234567890 |

---

### Solução Proposta

**Opção A (Recomendada)**: Alterar a lógica do Dashboard para verificar `isAdminOrManager` ANTES de `isCleaner`.

**Opção B**: Alterar `hasRole()` para Super-Admins terem comportamento baseado no role real, não em bypass universal.

**Escolha: Opção A** - Menor impacto no sistema, corrige o problema pontualmente no Dashboard.

---

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Linha 342: Inverter ordem da verificação de roles |

---

### Correção no Código

**Antes (linha 341-343)**:
```tsx
// Cleaner Dashboard
if (isCleaner) {
  return (
```

**Depois**:
```tsx
// Admin/Manager Dashboard - verificar PRIMEIRO
if (isAdminOrManager) {
  // Render Premium Dashboard
}

// Cleaner Dashboard - fallback para cleaners
// (movido para o final do componente)
```

---

### Mudança Estrutural

```tsx
const Dashboard = () => {
  const { isCleaner, isAdminOrManager } = useRoleAccess();
  
  // ... hooks e useEffect ...
  
  // ✅ Verificar Admin/Manager PRIMEIRO (maior privilégio)
  if (isAdminOrManager) {
    return (
      <div className="...">
        {/* Premium Enterprise Dashboard */}
      </div>
    );
  }
  
  // ✅ Cleaner Dashboard como fallback
  return (
    <div className="...">
      {/* Cleaner Dashboard */}
    </div>
  );
};
```

---

### Lógica Corrigida

| Usuário | `isAdminOrManager` | `isCleaner` | Dashboard Renderizado |
|---------|-------------------|-------------|----------------------|
| Admin | `true` | `true`* | **Admin** ✅ |
| Manager | `true` | `true`* | **Admin** ✅ |
| Cleaner | `false` | `true` | **Cleaner** ✅ |
| Super-Admin | `true` | `true` | **Admin** ✅ |

*Devido ao bypass do `isSuperAdmin`, mas agora a ordem correta evita o problema.

---

### Resumo das Mudanças

1. **Linha ~342**: Mover o bloco do Admin Dashboard para **ANTES** do Cleaner Dashboard
2. **Linha ~432**: O bloco atual do Admin vai para a posição do Cleaner
3. Inverter a lógica: verificar `isAdminOrManager` primeiro, depois renderizar Cleaner como fallback

---

### Resultado Esperado

Após a correção:
- **Eliana (Super-Admin/Admin)**: Verá o Dashboard Premium Enterprise com KPIs, gráficos e seção "Attention Required"
- **Cleaners**: Continuarão vendo o Dashboard simplificado com "Today's Jobs", "Week Jobs", etc.
