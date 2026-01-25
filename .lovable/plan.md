

## Plano: Ocultar Botão "Collapse" Quando Focus Mode Estiver Ativo

### Problema Identificado
O Focus Mode da Schedule (`focusMode`) é um estado local dentro do componente `Schedule.tsx` (linha 249). O `Sidebar.tsx` não tem conhecimento desse estado, então o botão "Collapse" (linhas 321-339) continua visível mesmo quando a Schedule está expandida.

---

### Solução: Estado Global para Focus Mode

Adicionar `focusMode` ao `workspaceStore` para que seja acessível tanto pela Schedule quanto pelo Sidebar.

---

### Fase 1: Atualizar workspaceStore

**Arquivo:** `src/stores/workspaceStore.ts`

1. Adicionar estado `focusMode` ao store:
```typescript
interface WorkspaceState {
  // ... existing properties
  focusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
}
```

2. Implementar o estado (sem persistir, para reset ao recarregar):
```typescript
focusMode: false,

setFocusMode: (enabled: boolean) => {
  set({ focusMode: enabled });
},
```

---

### Fase 2: Atualizar Schedule.tsx

**Arquivo:** `src/pages/Schedule.tsx`

1. Remover estado local `focusMode`:
```typescript
// REMOVER:
const [focusMode, setFocusMode] = useState(false);
```

2. Usar o estado do store:
```typescript
import { useWorkspaceStore } from '@/stores/workspaceStore';

// Dentro do componente:
const { focusMode, setFocusMode } = useWorkspaceStore();
```

3. O botão toggle continua funcionando igual:
```typescript
onClick={() => setFocusMode(!focusMode)}
```

---

### Fase 3: Atualizar Sidebar.tsx

**Arquivo:** `src/components/layout/Sidebar.tsx`

1. Importar o focusMode do store:
```typescript
const { focusMode } = useWorkspaceStore();
```

2. Ocultar o botão "Collapse" quando focusMode estiver ativo (linhas 320-339):
```typescript
{/* Collapse Toggle - Hidden when Focus Mode is active */}
{!focusMode && (
  <div className="mt-auto shrink-0">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCollapsed(!collapsed)}
      className={cn(
        "w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-none border-t border-border",
        collapsed ? "justify-center px-0" : "justify-start px-3"
      )}
    >
      {collapsed ? (
        <ChevronRight className="h-3.5 w-3.5" />
      ) : (
        <>
          <ChevronLeft className="h-3.5 w-3.5 mr-2" />
          <span>Collapse</span>
        </>
      )}
    </Button>
  </div>
)}
```

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/stores/workspaceStore.ts` | Adicionar `focusMode` e `setFocusMode` |
| `src/pages/Schedule.tsx` | Usar `focusMode` do store ao invés de estado local |
| `src/components/layout/Sidebar.tsx` | Condicionar visibilidade do botão Collapse ao `focusMode` |

---

### Resultado Final

- Quando o usuário clicar no botão **Expand** (Focus Mode) na Schedule, o botão "Collapse" do sidebar desaparece
- Quando o usuário clicar no botão **Minimize** para sair do Focus Mode, o botão "Collapse" reaparece
- O sidebar pode continuar colapsado/expandido independentemente, mas seu botão de controle fica oculto durante o Focus Mode

