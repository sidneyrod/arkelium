

## Plano: Separar Company Profile em Duas Telas

### Objetivo

Dividir a tela atual "Company Profile" em duas telas distintas:

| Tela Atual | Nova Tela | Conteúdo |
|------------|-----------|----------|
| Company Profile (Profile Tab) | **Companies** | CRUD de empresas (lista, criar, editar, excluir) |
| Company Profile (outras tabs) | **Business** | Activities, Branding, Estimates, Schedule Config, Preferences |

---

## Estrutura Final

### 1. Tela Companies (`/companies`)

**Responsabilidade:** Apenas cadastro de empresas

- Lista de empresas com tabela
- Botão "Register Company"
- Modal de criar/editar empresa
- Excluir empresa
- Selecionar empresa ativa

**Não terá:**
- Tabs
- Configurações de branding, pricing, preferences

---

### 2. Tela Business (`/business`)

**Responsabilidade:** Configurações do grupo de negócios e empresas

**Tabs:**
| Tab | Descrição |
|-----|-----------|
| Activities | Atividades de serviço (por empresa selecionada) |
| Branding | Logo, cores, Business Group Name |
| Estimates | Hourly rate, tax rate, extra fees |
| Schedule Config | Checklist de conclusão |
| Preferences | Invoice mode, cash handling, reports, receipt settings |

**Nota:** Cada tab carrega dados da empresa ativa selecionada no CompanyFilter local (mesmo padrão dinâmico dos outros módulos).

---

## Navegação Sidebar

A estrutura do menu será atualizada:

```text
Administration
├── Companies (novo)      → /companies
├── Business (novo)       → /business
├── Users                 → /users  
├── Access & Roles        → /access-roles
├── Settings              → /settings
└── Audit & Activity Log  → /activity-log
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Companies.tsx` | **Criar** - Nova página apenas com lista/CRUD de empresas |
| `src/pages/Business.tsx` | **Criar** - Nova página com tabs de configurações |
| `src/pages/Company.tsx` | **Remover** - Substituída pelas duas novas |
| `src/components/layout/Sidebar.tsx` | **Editar** - Adicionar links Companies e Business |
| `src/App.tsx` | **Editar** - Atualizar rotas |

---

## Detalhes Técnicos

### Companies.tsx

```tsx
// Estrutura simplificada
const Companies = () => {
  // Lista de empresas
  // Modal criar/editar
  // Confirmação de exclusão
  // Sem tabs
  
  return (
    <div className="p-2 lg:p-3 space-y-4">
      <PageHeader title="Companies" description="Manage your business companies" />
      
      {/* Tabela de empresas reutiliza CompanyListTable */}
      <CompanyListTable ... />
      
      {/* Modal criar/editar reutiliza EditCompanyModal */}
      <EditCompanyModal ... />
    </div>
  );
};
```

---

### Business.tsx

```tsx
// Estrutura com tabs de configuração
const Business = () => {
  // CompanyFilter para selecionar empresa
  // Tabs: Activities, Branding, Estimates, Schedule, Preferences
  
  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Header com CompanyFilter */}
      <div className="flex items-center justify-between">
        <PageHeader title="Business Settings" />
        <CompanyFilter
          value={selectedCompanyId}
          onChange={setSelectedCompanyId}
          showAllOption={false}  // Apenas uma empresa por vez aqui
        />
      </div>
      
      <Tabs>
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Config</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo das tabs - reutiliza componentes existentes */}
        <TabsContent value="activities">
          <ActivitiesTab companyId={selectedCompanyId} />
        </TabsContent>
        {/* ... outras tabs ... */}
      </Tabs>
    </div>
  );
};
```

---

## Reutilização de Componentes

Os seguintes componentes serão **reutilizados sem modificação**:

| Componente | Usado em |
|------------|----------|
| `CompanyListTable` | Companies.tsx |
| `EditCompanyModal` | Companies.tsx |
| `ActivitiesTab` | Business.tsx |
| `PreferencesTab` | Business.tsx |

---

## Fluxo de Navegação

```text
┌─────────────────────────────────────────────────────────────┐
│                     COMPANIES PAGE                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [+ Register Company]                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ # │ Company Name    │ City    │ Status │ Actions   │   │
│  │ 1 │ Tidy Out        │ Toronto │ Active │ ✏️ 🗑️      │   │
│  │ 2 │ CleanPro        │ Ottawa  │ Active │ ✏️ 🗑️      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Clicking ✏️ opens EditCompanyModal                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS PAGE                           │
│                                                             │
│  Business Settings          [🏢 Tidy Out ▼] CompanyFilter   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Activities] [Branding] [Estimates] [Schedule] [Pref]│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                       │   │
│  │   Content based on selected tab + company             │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Separação de responsabilidades** - Cadastro separado de configuração
2. **Navegação mais clara** - Usuário sabe exatamente onde ir
3. **Menos complexidade** - Cada página tem foco único
4. **Padrão dinâmico** - Business usa CompanyFilter para alternar contexto
5. **Reutilização** - Componentes existentes são preservados

