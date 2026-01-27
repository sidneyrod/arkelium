

## Diagnóstico: Bug na Lógica de Fetch do Dashboard

### Problema Identificado

| Causa Raiz | Localização | Impacto |
|------------|-------------|---------|
| **Lógica de `hasRole` retorna `true` para Super Admins em qualquer role** | `AuthContext.tsx` linha 239 | Super Admins são tratados como Cleaners no `fetchDashboardData` |

### Fluxo do Bug

```text
┌─────────────────────────────────────────────────────────────────────┐
│ USUÁRIO: Eliana (Super Admin)                                       │
├─────────────────────────────────────────────────────────────────────┤
│ 1. hasRole(['cleaner']) → TRUE (Super Admin = todas as roles)       │
│ 2. hasRole(['admin', 'manager']) → TRUE                             │
│                                                                     │
│ fetchDashboardData:                                                 │
│ ├── if (isCleaner && user) { ← ENTRA AQUI (isCleaner = true)       │
│ │     ... busca dados filtrados por cleaner_id = Eliana            │
│ │     return; ← RETORNA SEM BUSCAR DADOS DE ADMIN                  │
│ │   }                                                               │
│ └── // Código de Admin/Manager NUNCA EXECUTA                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Resultado

- Revenue MTD: **$0** (deveria ser $440.70)
- Jobs, Performance, Alerts: **0** (sem dados de admin)
- Gráficos: **Vazios**

---

## Solução Proposta

### Modificar Condição no `fetchDashboardData`

**Linha 202 - Antes:**
```tsx
if (isCleaner && user) {
```

**Depois:**
```tsx
if (isCleaner && !isAdminOrManager && user) {
```

Esta mudança garante que a lógica de cleaner só é executada se o usuário é **apenas** cleaner, e não se ele é Admin/Manager (ou Super Admin com acesso total).

### Mudanças Detalhadas

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/pages/Dashboard.tsx` | 202 | Adicionar `&& !isAdminOrManager` na condição |

### Código Completo da Mudança

```tsx
// Adicionar isAdminOrManager às dependências do useCallback se não estiver
const fetchDashboardData = useCallback(async () => {
  if (!selectedCompanyId) return;

  // ... (outras variáveis)

  try {
    // For cleaners ONLY (not admin/manager): only fetch their own jobs
    if (isCleaner && !isAdminOrManager && user) {  // ← CORREÇÃO AQUI
      // ... cleaner data fetch
      return;
    }

    // Admin/Manager: fetch all company data
    // ... (resto do código)
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  }
}, [selectedCompanyId, user?.id, isCleaner, isAdminOrManager, period]);  // ← Adicionar isAdminOrManager
```

---

## Verificação do Impacto

### Cenários de Teste

| Usuário | isCleaner | isAdminOrManager | Condição `isCleaner && !isAdminOrManager` | Dashboard |
|---------|-----------|------------------|------------------------------------------|-----------|
| Super Admin | true | true | **false** | Admin Dashboard ✓ |
| Admin | false | true | **false** | Admin Dashboard ✓ |
| Manager | false | true | **false** | Admin Dashboard ✓ |
| Cleaner | true | false | **true** | Cleaner Dashboard ✓ |

---

## Resumo

**1 linha de mudança** resolverá o problema:
- Super Admins e Admins/Managers verão os dados corretos do dashboard
- Cleaners continuarão vendo apenas seus próprios dados

