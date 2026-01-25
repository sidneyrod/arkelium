

## Plano: Nome do Grupo Dinâmico + Remover Lista de Empresas + Editar Nome do Grupo na Aba Branding

### Situação Atual
- TopBar mostra "Business Group" fixo (linha 414)
- Company.tsx tem seletor de empresa (linhas 986-997) e lista de empresas na tab Profile
- Não usaremos a tabela `organizations` - tudo será dinâmico

---

### Fase 1: Criar Coluna para Nome do Grupo (Database)

**Opção escolhida**: Criar uma tabela simples `app_settings` para configurações globais do sistema.

**Migration SQL:**
```sql
-- Criar tabela de configurações globais
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem gerenciar
CREATE POLICY "Admins can manage app settings"
ON app_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_super_admin = true
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin' 
    AND user_roles.status = 'active'
  )
);

-- Política: Todos podem visualizar
CREATE POLICY "Anyone can view app settings"
ON app_settings FOR SELECT
USING (true);

-- Inserir nome inicial do grupo
INSERT INTO app_settings (key, value) 
VALUES ('business_group_name', 'Business Group');
```

---

### Fase 2: Atualizar TopBar para Exibir Nome Dinâmico

**Arquivo:** `src/components/layout/TopBar.tsx`

1.  **Adicionar fetch do nome do grupo:**
    ```typescript
    const [groupName, setGroupName] = useState<string>('Business Group');

    useEffect(() => {
      const fetchGroupName = async () => {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'business_group_name')
          .maybeSingle();
        
        if (data?.value) {
          setGroupName(data.value);
        }
      };
      fetchGroupName();
    }, []);
    ```

2.  **Atualizar exibição (linha 414):**
    ```typescript
    // Antes:
    {companies.length > 0 ? 'Business Group' : 'No Companies'}

    // Depois:
    {groupName}
    ```

---

### Fase 3: Adicionar Campo para Editar Nome do Grupo na Aba Branding

**Local:** Página `Company.tsx`, dentro da aba `Branding` (antes do Company Logo).

**Arquivo:** `src/pages/Company.tsx` (linhas 1021-1092)

1.  **Adicionar estado para o nome do grupo:**
    ```typescript
    const [groupName, setGroupName] = useState<string>('Business Group');
    const [isSavingGroupName, setIsSavingGroupName] = useState(false);
    ```

2.  **Adicionar fetch no useEffect inicial:**
    ```typescript
    useEffect(() => {
      const fetchGroupName = async () => {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'business_group_name')
          .maybeSingle();
        if (data?.value) setGroupName(data.value);
      };
      fetchGroupName();
    }, []);
    ```

3.  **Adicionar função de salvar:**
    ```typescript
    const handleSaveGroupName = async () => {
      setIsSavingGroupName(true);
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'business_group_name', value: groupName, updated_at: new Date().toISOString() }, 
          { onConflict: 'key' });
      
      if (!error) {
        toast({ title: 'Success', description: 'Group name updated' });
      }
      setIsSavingGroupName(false);
    };
    ```

4.  **Adicionar Card antes do Company Logo (linha ~1030):**
    ```tsx
    {/* Business Group Name - ANTES do Company Logo */}
    <Card className="border-border/50 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Business Group Name
        </CardTitle>
        <CardDescription className="text-xs">
          This name appears in the top bar for all users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="max-w-sm"
          />
          <Button 
            onClick={handleSaveGroupName} 
            disabled={isSavingGroupName}
            size="sm"
          >
            {isSavingGroupName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
    
    {/* Company Logo - Card existente continua aqui */}
    ```

---

### Fase 4: Remover Seletor e Lista de Empresas da Página Company

**Arquivo:** `src/pages/Company.tsx`

1.  **Remover seletor de empresa (linhas 986-997)**
2.  **Remover tab "Profile" inteira (linhas 960-963 e 1001-1011)**
3.  **Atualizar `defaultValue` das tabs para `"branding"` (linha 957)**

**Código a remover:**
```tsx
// Remover linhas 986-997 (seletor dropdown)
<div className="flex items-center gap-2">
  <Select value={activeCompanyId || ''} onValueChange={handleSelectCompany}>
    ...
  </Select>
</div>

// Remover TabsTrigger "profile" (linhas 960-963)
<TabsTrigger value="profile" ...>
  ...
</TabsTrigger>

// Remover TabsContent "profile" (linhas 1001-1011)
<TabsContent value="profile" className="space-y-4 mt-4">
  <CompanyListTable ... />
</TabsContent>
```

---

### Fase 5: Simplificar Tabs da Página Company

**Tabs que permanecem:**
- Activities (gestao de atividades)
- Branding (logo, cores e **nome do grupo**)
- Estimates (configuracao de valores)
- Schedule Config (configuracao de agenda)
- Preferences (preferencias gerais)

**Tab removida:**
- Profile (lista de empresas)

---

### Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| **Migration SQL** | Criar tabela `app_settings` com nome do grupo |
| `TopBar.tsx` | Buscar e exibir nome dinamico do grupo |
| `Company.tsx` | Remover seletor (986-997), remover tab Profile, adicionar campo Group Name na aba Branding |
| `CompanyListTable.tsx` | Pode ser removido ou mantido para uso futuro |

---

### Resultado Final

1.  **TopBar**: Exibe o nome definido pelo ADMIN (ex: "Arkelium Group")
2.  **Pagina Company**: Aba Branding com campo para editar nome do grupo + tabs de configuracao, sem lista de empresas
3.  **ADMIN pode editar**: Nome do grupo via aba Branding na pagina Company
4.  **Sistema dinamico**: Filtros de empresa em cada modulo operacional sao mantidos

