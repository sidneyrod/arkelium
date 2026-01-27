
## Plano: Seleção Dinâmica de Empresa no Dashboard

### Visão Geral do Requisito

O usuário precisa:
1. **Empresa Padrão Configurável**: Opção nas Preferências da Empresa para definir qual empresa inicia os dados do Dashboard ao logar
2. **Seletor Dinâmico no Dashboard**: Opção para trocar a empresa ao lado do filtro de data para análise dinâmica
3. **Filtro de Data**: Seguir padrão existente (1º dia do mês até hoje) - já implementado via `getDefaultDateRange()`

---

### Arquitetura Atual

| Componente | Função |
|------------|--------|
| `activeCompanyStore` | Armazena empresa ativa globalmente (persistido no localStorage) |
| `useAccessibleCompanies` | Retorna empresas acessíveis ao usuário |
| `TopBar.tsx` | Define empresa inicial baseada no `profile.company_id` |
| `Dashboard.tsx` | Usa `activeCompanyId` do store para buscar dados |
| `company_estimate_config` | Preferências da empresa (invoice, cash, etc.) |

---

### Mudanças Necessárias

#### 1. Schema do Banco de Dados

**Adicionar coluna na tabela `profiles`:**

```sql
ALTER TABLE profiles 
ADD COLUMN default_dashboard_company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
```

**Motivação**: A preferência de empresa padrão do Dashboard é específica do **usuário**, não da empresa. Assim, cada usuário pode escolher qual empresa ele quer ver primeiro ao logar.

---

#### 2. Company/Preferences - Novo Card "Dashboard Settings"

**Arquivo**: `src/components/company/PreferencesTab.tsx`

Adicionar nova seção para selecionar empresa padrão do Dashboard:

```tsx
{/* Dashboard Settings */}
<Card className="border-border/50">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium flex items-center gap-2">
      <LayoutDashboard className="h-4 w-4 text-primary" />
      Dashboard Settings
    </CardTitle>
    <CardDescription className="text-xs">
      Configure your dashboard startup preferences
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
      <div className="flex-1 pr-4">
        <Label htmlFor="default-company" className="text-sm font-medium">
          Default Dashboard Company
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Select which company data will be displayed when you open the Dashboard.
        </p>
      </div>
      <Select value={defaultDashboardCompany} onValueChange={setDefaultDashboardCompany}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {accessibleCompanies.map(company => (
            <SelectItem key={company.id} value={company.id}>
              {company.trade_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

---

#### 3. Dashboard - Adicionar CompanyFilter no Header

**Arquivo**: `src/pages/Dashboard.tsx`

Modificar a row de header para incluir o seletor de empresa:

```tsx
{/* Header Row */}
<div className="flex flex-wrap items-center justify-between gap-4">
  <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
  
  {/* Company + Period Filters */}
  <div className="flex items-center gap-3">
    <CompanyFilter
      value={selectedCompanyId || ''}
      onChange={(id) => setSelectedCompanyId(id === 'all' ? null : id)}
      showAllOption={false}
      placeholder="Select Company"
      className="w-[200px]"
    />
    <PeriodSelector value={period} onChange={setPeriod} />
  </div>
</div>
```

**Layout Visual:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard                  [📦 TidyOut ▼] [📅 Jan 1 - Jan 27 ▼] │
└──────────────────────────────────────────────────────────────────┘
```

---

#### 4. Lógica de Inicialização

**Arquivo**: `src/pages/Dashboard.tsx`

```tsx
const Dashboard = () => {
  const { user } = useAuth();
  const { activeCompanyId, setActiveCompany } = useActiveCompanyStore();
  const { companies, getDefaultCompanyId } = useAccessibleCompanies();
  
  // Local state for dashboard company filter
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  // Initialize with user's preferred default company
  useEffect(() => {
    const initializeDefaultCompany = async () => {
      if (selectedCompanyId) return; // Already initialized
      
      // 1. Try user's configured default
      const { data } = await supabase
        .from('profiles')
        .select('default_dashboard_company_id')
        .eq('id', user?.id)
        .single();
      
      if (data?.default_dashboard_company_id) {
        setSelectedCompanyId(data.default_dashboard_company_id);
        return;
      }
      
      // 2. Fallback to activeCompanyId or first accessible
      setSelectedCompanyId(activeCompanyId || getDefaultCompanyId());
    };
    
    initializeDefaultCompany();
  }, [user?.id, companies]);
  
  // Fetch dashboard data using selectedCompanyId
  const fetchDashboardData = useCallback(async () => {
    if (!selectedCompanyId) return;
    
    const companyId = selectedCompanyId;
    // ... rest of fetch logic
  }, [selectedCompanyId, period]);
};
```

---

### Resumo dos Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| **Migração SQL** | Adicionar `default_dashboard_company_id` na tabela `profiles` |
| `src/pages/Dashboard.tsx` | Adicionar `CompanyFilter` no header + lógica de inicialização |
| `src/components/company/PreferencesTab.tsx` | Adicionar card "Dashboard Settings" para selecionar empresa padrão |
| `src/hooks/useCompanyPreferences.ts` | (Opcional) Adicionar preferência de empresa padrão do usuário |

---

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOGIN                                       │
├─────────────────────────────────────────────────────────────────────┤
│ 1. User logs in                                                     │
│ 2. AuthContext loads profile                                        │
│ 3. Dashboard mounts → reads profiles.default_dashboard_company_id   │
│ 4. If null → fallback to activeCompanyId or first accessible        │
│ 5. Dashboard fetches data for selectedCompanyId                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   DYNAMIC COMPANY SWITCH                            │
├─────────────────────────────────────────────────────────────────────┤
│ 1. User clicks CompanyFilter on Dashboard                           │
│ 2. Selects different company                                        │
│ 3. setSelectedCompanyId triggers fetchDashboardData                 │
│ 4. KPIs, charts, alerts update for new company                      │
│ 5. (Does NOT change global activeCompanyId)                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              CONFIGURE DEFAULT (Company/Preferences)                │
├─────────────────────────────────────────────────────────────────────┤
│ 1. User opens Company Profile → Preferences tab                     │
│ 2. Selects "Default Dashboard Company"                              │
│ 3. Saves → UPDATE profiles SET default_dashboard_company_id = ?     │
│ 4. Next login → Dashboard auto-selects this company                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Considerações de Segurança

1. **RLS**: A coluna `default_dashboard_company_id` só pode ser atualizada pelo próprio usuário
2. **Validação**: Ao salvar, verificar se o usuário tem acesso à empresa selecionada via `user_roles`
3. **FK Constraint**: `ON DELETE SET NULL` para evitar referências órfãs se empresa for arquivada

---

### Resultado Esperado

1. **Ao logar**: Dashboard carrega automaticamente os dados da empresa configurada como padrão pelo usuário
2. **Durante uso**: Usuário pode trocar a empresa dinamicamente sem sair do Dashboard
3. **Filtro de data**: Mantém comportamento padrão (1º do mês até hoje)
4. **Persistência**: A preferência fica salva no perfil do usuário
