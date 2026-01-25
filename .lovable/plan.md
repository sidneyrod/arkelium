

## Plano: Sistema Dinâmico com Filtros por Empresa em Cada Módulo

### Visão Geral da Mudança

O sistema deixará de ter um "seletor de empresa ativa global" e passará a ter **filtros de empresa contextuais** dentro de cada módulo. O ADMIN terá controle total para analisar dados de qualquer empresa a qualquer momento.

---

### Fase 1: Remover Seletor Global de Empresa

**Arquivo:** `src/components/layout/TopBar.tsx`

1. **Converter o dropdown de empresa em apenas exibição do nome do grupo**
   - Remover o `DropdownMenu` com lista de empresas (linhas 410-451)
   - Substituir por um elemento estático mostrando apenas o nome da organização/grupo
   - Manter o ícone `Building2` para contexto visual

2. **Alternativa de Exibição:**
   - Se não houver `organization` vinculada, mostrar "All Companies" ou o nome da empresa principal do usuário
   - Texto estático, sem interação de click

---

### Fase 2: Adicionar Filtro de Empresa nos Módulos Operacionais

**Componente Reutilizável:** `src/components/ui/company-filter.tsx`

```tsx
// Novo componente de filtro de empresa
interface CompanyFilterProps {
  value: string | 'all';
  onChange: (companyId: string | 'all') => void;
  showAllOption?: boolean; // Para relatórios consolidados
  className?: string;
}
```

**Módulos que receberão o filtro:**

| Módulo | Arquivo | Comportamento |
|--------|---------|---------------|
| Schedule | `Schedule.tsx` | Filtrar jobs por empresa selecionada |
| Invoices | `Invoices.tsx` | Filtrar invoices por empresa |
| Receipts | `Receipts.tsx` | Filtrar recibos por empresa |
| Payments | `PaymentsCollections.tsx` | Filtrar cash collections por empresa |
| Financial Ledger | `Financial.tsx` | Filtrar ledger por empresa |
| Clients | `Clients.tsx` | Filtrar clientes por empresa |
| Contracts | `Contracts.tsx` | Filtrar contratos por empresa |
| Completed Services | `CompletedServices.tsx` | Filtrar por empresa |
| Work & Time Tracking | `WorkEarningsSummary.tsx` | Filtrar por empresa |

---

### Fase 3: Refatorar Store de Empresa

**Arquivo:** `src/stores/activeCompanyStore.ts`

1. **Remover lógica de "empresa ativa global"**
   - O `activeCompanyId` deixa de ser o contexto único
   - Cada módulo gerencia seu próprio filtro local

2. **Adicionar helper para filtro padrão:**
   ```typescript
   // Retorna a empresa do perfil do usuário como default
   getDefaultCompanyId: () => string | null
   ```

---

### Fase 4: Simplificar Status das Empresas

**Arquivo:** `src/pages/Company.tsx` e `src/components/company/CompanyListTable.tsx`

1. **Unificar status para binary:**
   - `active` = Participando das movimentações
   - `inactive` = Não participa (dados históricos preservados)

2. **Remover status "AVAILABLE"** - consolidar em apenas ACTIVE/INACTIVE

3. **Atualizar badges visuais:**
   - ACTIVE = Badge verde (operacional)
   - INACTIVE = Badge cinza (pausado)

---

### Fase 5: Remover Seletor de Empresa na Página Company

**Arquivo:** `src/pages/Company.tsx`

1. **Linhas 986-996**: Remover o `Select` de empresa ao lado das tabs
2. **A lista de empresas na tab Profile permanece** para gerenciamento (editar, criar, deletar)
3. **Ao clicar em uma empresa na lista**: Abre modal de edição, não troca contexto global

---

### Fase 6: Relatórios Dinâmicos com Filtros

**Novos Parâmetros de Relatório:**

Cada modal/tela de geração de relatório terá:

```tsx
// Campos obrigatórios para relatórios
<PeriodSelector value={dateRange} onChange={setDateRange} />
<CompanyFilter 
  value={companyFilter} 
  onChange={setCompanyFilter}
  showAllOption={true} // Permite "Todas as Empresas"
/>
```

**Módulos de Relatório Afetados:**
- `GenerateReportModal.tsx` - Relatórios financeiros
- `ExportReportButton.tsx` - Exportações de dados
- `Financial.tsx` - Ledger exports (CSV/PDF)
- Dashboard KPIs - Adicionar filtro de empresa

---

### Fase 7: Atualizar RLS e Queries

**Padrão de Query Atualizado:**

```typescript
// Antes (usa activeCompanyId global)
.eq('company_id', activeCompanyId)

// Depois (aceita filtro ou lista de empresas acessíveis)
.eq('company_id', selectedCompanyId) // ou
.in('company_id', accessibleCompanyIds) // para "all"
```

**Hook de Empresas Acessíveis:**
```typescript
// Novo hook: useAccessibleCompanies
const { companies, isLoading } = useAccessibleCompanies();
// Retorna todas as empresas que o usuário pode acessar via user_roles
```

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `TopBar.tsx` | Remover dropdown, exibir nome fixo |
| `Company.tsx` | Remover seletor, manter lista de gestão |
| `CompanyListTable.tsx` | Atualizar status badges (ACTIVE/INACTIVE) |
| `activeCompanyStore.ts` | Refatorar para defaults, não contexto único |
| `Schedule.tsx` | Adicionar filtro de empresa inline |
| `Invoices.tsx` | Adicionar filtro de empresa |
| `Receipts.tsx` | Adicionar filtro de empresa |
| `PaymentsCollections.tsx` | Adicionar filtro de empresa |
| `Financial.tsx` | Adicionar filtro de empresa |
| `Clients.tsx` | Adicionar filtro de empresa |
| `Dashboard.tsx` | Adicionar filtro de empresa nos KPIs |
| **Novo:** `company-filter.tsx` | Componente reutilizável |
| **Novo:** `useAccessibleCompanies.ts` | Hook para listar empresas do usuário |

---

### Resultado Final

1. **TopBar**: Exibe apenas nome do grupo/empresa principal (sem dropdown)
2. **Cada módulo**: Tem seu próprio filtro de empresa no header
3. **Status simplificado**: Apenas ACTIVE/INACTIVE
4. **Relatórios**: Sempre pedem período + empresa antes de gerar
5. **Flexibilidade total**: ADMIN pode analisar qualquer empresa em qualquer tela

