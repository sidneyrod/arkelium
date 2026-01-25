

## Plano: Fazer os KPIs Acompanharem o Período de Data Selecionado

### Objetivo
Os KPIs (JOBS, DONE, IN PROGRESS, TODAY) devem refletir apenas os jobs que estão **dentro do período visível** (dia, semana, ou mês selecionado), não o total histórico da empresa.

### Arquivo a Modificar
`src/pages/Schedule.tsx`

---

### 1. Criar uma função para determinar o intervalo de datas do período visível

```typescript
// Adicionar helper para obter range de datas baseado na view e currentDate
const getVisibleDateRange = useMemo(() => {
  switch (viewType) {
    case 'day':
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate)
      };
    case 'week':
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    case 'month':
    default:
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
  }
}, [viewType, currentDate]);
```

---

### 2. Criar `periodFilteredJobs` que filtra por período visível

```typescript
// Filtrar jobs pelo período visível (além do filtro de busca)
const periodFilteredJobs = useMemo(() => {
  const { start, end } = getVisibleDateRange;
  return filteredJobs.filter(job => {
    const jobDate = toSafeLocalDate(job.date);
    return jobDate >= start && jobDate <= end;
  });
}, [filteredJobs, getVisibleDateRange]);
```

---

### 3. Atualizar `summaryStats` para usar `periodFilteredJobs`

```typescript
const summaryStats = useMemo(() => {
  const today = new Date();
  
  // Usar periodFilteredJobs em vez de filteredJobs
  const todayJobs = periodFilteredJobs.filter(job => 
    isSameDay(toSafeLocalDate(job.date), today)
  );
  const completedCount = periodFilteredJobs.filter(job => 
    job.status === 'completed'
  ).length;
  const inProgressCount = periodFilteredJobs.filter(job => 
    job.status === 'in-progress'
  ).length;
  const scheduledCount = periodFilteredJobs.filter(job => 
    job.status === 'scheduled'
  ).length;
  
  return {
    total: periodFilteredJobs.length,        // ← Total do período
    completed: completedCount,               // ← Completados do período
    inProgress: inProgressCount,             // ← Em progresso do período
    scheduled: scheduledCount,               // ← Agendados do período
    todayCount: todayJobs.length,            // ← Hoje real (mantém)
  };
}, [periodFilteredJobs]);
```

---

### 4. (Opcional) Ajustar label "Today" para ser contextual

Se o usuário estiver navegando em um mês diferente, pode fazer sentido alterar o KPI "TODAY" para mostrar algo mais relevante. Mas inicialmente podemos manter como está (sempre mostra jobs do dia atual real).

---

### Resultado Esperado

| View | Período | KPIs Mostrarão |
|------|---------|----------------|
| **Month: January 2026** | 1-31 Jan 2026 | Jobs apenas de Janeiro 2026 |
| **Week: 19-25 Jan** | 19-25 Jan | Jobs apenas dessa semana |
| **Day: 25 Jan** | 25 Jan | Jobs apenas desse dia |

### Exemplo Visual

**Antes (Janeiro 2026 selecionado):**
- 45 JOBS | 38 DONE | 0 IN PROGRESS | 0 TODAY ← Dados de TODA a história

**Depois (Janeiro 2026 selecionado):**
- 12 JOBS | 8 DONE | 1 IN PROGRESS | 0 TODAY ← Apenas dados de Janeiro 2026

---

### Imports Necessários

Já existentes: `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek` (de `date-fns`)

Adicionar se necessário: `startOfDay`, `endOfDay`

