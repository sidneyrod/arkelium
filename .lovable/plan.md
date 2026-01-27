

## Plano: Seleção de Empresa Dinâmica com Popup de Preferência

### Problemas Identificados

| Problema | Localização | Causa |
|----------|-------------|-------|
| **Empresa sempre selecionada automaticamente** | `Dashboard.tsx` linhas 109-111 | O fallback seleciona a primeira empresa mesmo sem preferência |
| **Popup de configuração inexistente** | - | Não existe lógica para detectar primeira seleção sem preferência |
| **"Select Company" nunca aparece** | - | Devido ao auto-select de fallback |

---

### Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE INICIALIZAÇÃO                          │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Dashboard monta                                                  │
│ 2. Busca profiles.default_dashboard_company_id                      │
│    ├── Se existe e tem acesso → seleciona                           │
│    └── Se NÃO existe → mantém null (mostra "Select Company")        │
│ 3. selectedCompanyId = null → exibe placeholder no CompanyFilter    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  FLUXO DE PRIMEIRA SELEÇÃO                          │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Usuário clica no CompanyFilter                                   │
│ 2. Seleciona uma empresa                                            │
│ 3. Sistema verifica: hasDefaultPreference === false?                │
│    ├── SIM → Abre AlertDialog perguntando se quer salvar            │
│    │         como padrão e ir para Preferências                     │
│    └── NÃO → Apenas atualiza dados                                  │
│ 4. Dados do Dashboard recarregam dinamicamente                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Dashboard.tsx` | (1) Não fazer fallback automático se não tiver preferência; (2) Adicionar estado para controle de popup; (3) Adicionar AlertDialog para oferecer configuração; (4) Handler para mudança de empresa com verificação de preferência |

---

### Mudanças Detalhadas

#### 1. Estado para Controle de Preferência

```tsx
// Novos estados
const [hasDefaultPreference, setHasDefaultPreference] = useState<boolean | null>(null);
const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
```

#### 2. Modificar Lógica de Inicialização (linhas 78-128)

**Antes:**
```tsx
// 3. Fallback to first accessible company
if (activeCompanies.length > 0) {
  setSelectedCompanyId(activeCompanies[0].id);
  setIsInitialized(true);
}
```

**Depois:**
```tsx
// 3. Se não tem preferência, NÃO selecionar automaticamente
// Deixar null para mostrar "Select Company"
setHasDefaultPreference(false);
setIsInitialized(true);
// Não define selectedCompanyId - fica null
```

#### 3. Handler de Mudança de Empresa

```tsx
const handleCompanyChange = (companyId: string) => {
  const newCompanyId = companyId === 'all' ? null : companyId;
  
  // Se é a primeira seleção e não tem preferência salva
  if (newCompanyId && hasDefaultPreference === false) {
    setShowPreferenceDialog(true);
  }
  
  setSelectedCompanyId(newCompanyId);
};
```

#### 4. Adicionar AlertDialog para Preferência

```tsx
{/* Dialog de Configuração de Preferência */}
<AlertDialog open={showPreferenceDialog} onOpenChange={setShowPreferenceDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        Set Default Dashboard Company
      </AlertDialogTitle>
      <AlertDialogDescription>
        You haven't configured a default company for your Dashboard yet.
        Would you like to set this company as your default and go to 
        Preferences to complete the setup?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Not Now</AlertDialogCancel>
      <AlertDialogAction onClick={handleGoToPreferences}>
        Go to Preferences
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 5. Handler para Navegação às Preferências

```tsx
const handleGoToPreferences = async () => {
  // Salvar a empresa selecionada como padrão
  if (selectedCompanyId && user?.id) {
    await supabase
      .from('profiles')
      .update({ default_dashboard_company_id: selectedCompanyId })
      .eq('id', user.id);
    
    setHasDefaultPreference(true);
  }
  
  setShowPreferenceDialog(false);
  navigate('/company?tab=preferences');
};
```

---

### Imports Adicionais

```tsx
import { Settings2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

---

### Comportamento Final

| Cenário | Comportamento |
|---------|---------------|
| **Primeiro login (sem preferência)** | CompanyFilter mostra "Select Company" |
| **Primeira seleção** | Popup pergunta se quer configurar preferência |
| **Usuário clica "Go to Preferences"** | Salva preferência e redireciona para `/company?tab=preferences` |
| **Usuário clica "Not Now"** | Fecha popup, continua usando a empresa selecionada |
| **Login subsequente (com preferência)** | Carrega automaticamente a empresa preferida |
| **Trocar empresa após configurar** | Apenas troca, sem popup |

---

### Verificação de Dados Dinâmicos

A lógica de `fetchDashboardData` (linha 160) já está correta:
- Usa `selectedCompanyId` como filtro
- Verifica `if (!selectedCompanyId) return;` - não busca dados sem empresa
- Todas as queries usam `.eq('company_id', companyId)`

Os dados já são dinâmicos - o gráfico mostrará dados da empresa selecionada assim que uma for escolhida.

---

### Resumo da Implementação

1. **Remover fallback automático** na inicialização
2. **Adicionar estado** para rastrear se tem preferência
3. **Adicionar AlertDialog** para oferecer configuração
4. **Modificar onChange** do CompanyFilter para detectar primeira seleção
5. **Handler de navegação** que salva preferência e redireciona

