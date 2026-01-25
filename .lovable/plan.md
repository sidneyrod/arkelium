

## Plano: Definir Nome do Business Group e Remover Seletor de Empresa

### Situação Atual

1. **Tabela `organizations` existe mas está vazia** - O sistema já tem infraestrutura para grupos
2. **Empresas não têm `organization_id` vinculado** - Todas mostram `null`
3. **TopBar mostra "Business Group" de forma estática** (linha 414) - Texto fixo, não dinâmico
4. **Company.tsx tem seletor desnecessário** (linhas 986-997) - Precisa ser removido

---

### Fase 1: Criar Organização e Vincular Empresas (Database)

**Migration SQL:**
```sql
-- 1. Criar a organização do grupo
INSERT INTO organizations (name, legal_name, status)
VALUES ('Arkelium Group', 'Arkelium Business Group Inc.', 'active');

-- 2. Vincular todas as empresas existentes a esta organização
UPDATE companies 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Arkelium Group' LIMIT 1)
WHERE organization_id IS NULL;
```

---

### Fase 2: Atualizar TopBar para Exibir Nome da Organização

**Arquivo:** `src/components/layout/TopBar.tsx`

1. **Adicionar hook/query para buscar organização do usuário:**
   ```typescript
   const [organizationName, setOrganizationName] = useState<string | null>(null);
   
   useEffect(() => {
     const fetchOrganization = async () => {
       // Buscar organização via organization_members ou companies linkadas
       const { data } = await supabase
         .from('organization_members')
         .select('organization:organizations(name)')
         .eq('user_id', user?.id)
         .limit(1)
         .maybeSingle();
       
       if (data?.organization?.name) {
         setOrganizationName(data.organization.name);
       } else {
         // Fallback: buscar via company do usuário
         const { data: company } = await supabase
           .from('companies')
           .select('organization:organizations(name)')
           .eq('id', user?.profile?.company_id)
           .maybeSingle();
         
         if (company?.organization?.name) {
           setOrganizationName(company.organization.name);
         }
       }
     };
     
     if (user?.id) fetchOrganization();
   }, [user?.id, user?.profile?.company_id]);
   ```

2. **Atualizar exibição (linha 414):**
   ```typescript
   // Antes:
   <span className="text-sm font-medium text-foreground">
     {companies.length > 0 ? 'Business Group' : 'No Companies'}
   </span>
   
   // Depois:
   <span className="text-sm font-medium text-foreground">
     {organizationName || 'Business Group'}
   </span>
   ```

---

### Fase 3: Remover Seletor de Empresa na Página Company

**Arquivo:** `src/pages/Company.tsx`

**Remover linhas 986-997:**
```tsx
// REMOVER ESTE BLOCO INTEIRO:
<div className="flex items-center gap-2">
  <Select value={activeCompanyId || ''} onValueChange={handleSelectCompany}>
    <SelectTrigger className="w-[200px] h-8 text-sm">
      <SelectValue placeholder="Select company" />
    </SelectTrigger>
    <SelectContent className="bg-popover">
      {companies.filter(c => c.status !== 'archived').map(company => (
        <SelectItem key={company.id} value={company.id}>{company.trade_name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Manter:** A lista de empresas na tab Profile para gestão (editar/criar/excluir)

---

### Fase 4: (Opcional) Criar Tela para Gerenciar Organização

**Novo local para ADMIN editar o nome do grupo:**

Opção A: Adicionar no topo da página Company Profile
```tsx
<Card className="mb-4">
  <CardContent className="py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Building2 className="h-5 w-5 text-primary" />
      <div>
        <p className="text-sm font-medium">Business Group</p>
        <p className="text-xs text-muted-foreground">{organizationName}</p>
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={handleEditOrganization}>
      <Pencil className="h-3 w-3 mr-1" /> Edit
    </Button>
  </CardContent>
</Card>
```

Opção B: Adicionar nas Settings (Administration > Settings)

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| **Migration SQL** | Criar organização e vincular empresas |
| `TopBar.tsx` | Buscar e exibir nome da organização dinamicamente |
| `Company.tsx` | Remover seletor de empresa (linhas 986-997) |
| `Company.tsx` (opcional) | Adicionar card para gerenciar grupo |

---

### Resultado Final

1. **TopBar**: Exibe "Arkelium Group" (ou o nome definido) em vez de "Business Group"
2. **Company Profile**: Sem dropdown de seleção - apenas lista de empresas para gestão
3. **ADMIN pode editar**: Nome do grupo pode ser alterado via Settings ou modal
4. **Empresas vinculadas**: Todas as empresas ficam sob o mesmo `organization_id`

