

## Plano: Redesign Completo do Dashboard - Padrão Enterprise Premium

### Análise da Imagem de Referência

A imagem mostra um dashboard executivo com:
1. **Header**: Título "Dashboard" à esquerda + Date Range à direita
2. **4 KPIs Premium**: Revenue (MTD) com sparkline, On-Time Performance, In Progress, Critical Alerts
3. **Charts Row**: Revenue Trend (70%) + Operational Distribution Donut (30%)
4. **Attention Required**: 3 action cards com CTAs

---

## Estrutura de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/Dashboard.tsx` | Reescrever completamente |
| `src/components/dashboard/KPICard.tsx` | **NOVO** - Card de KPI premium |
| `src/components/dashboard/RevenueTrendChart.tsx` | **NOVO** - Gráfico de linha com forecast |
| `src/components/dashboard/OperationalDonut.tsx` | **NOVO** - Donut chart com métricas |
| `src/components/dashboard/AttentionCard.tsx` | **NOVO** - Cards de ação |
| `src/components/dashboard/MiniSparkline.tsx` | **NOVO** - Sparkline para KPIs |

---

## 1. Header do Dashboard

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                              📅 Jan 1 - Jan 25, 2026 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementação:**
- Título "Dashboard" com `text-xl font-semibold`
- PeriodSelector à direita com ícone de calendário
- Background limpo, sem cards extras

---

## 2. KPI Row - 4 Cards Únicos

Baseado na imagem de referência:

| KPI | Valor | Extra | Visual |
|-----|-------|-------|--------|
| Revenue (MTD) | $12,480 | +12% (verde) | Mini sparkline |
| On-Time Performance | 85% | Badge "Good" | Ícone de relógio |
| In Progress | 3 | 2 Delayed (warning) | Alerta amarelo |
| Critical Alerts | 0 | 3 Events | Ícone vermelho |

**Novo componente `KPICard.tsx`:**
```tsx
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  badge?: { text: string; variant: 'success' | 'warning' | 'danger' };
  warning?: { count: number; label: string };
  sparklineData?: number[];
  icon?: LucideIcon;
}
```

**Estilo:**
- Background branco puro
- Border radius 16px
- Shadow sutil `shadow-sm`
- Altura igual para todos (~100px)
- Sparkline integrada (se aplicável)

---

## 3. Charts Row - Layout 70/30

### 3.1 Revenue Trend Chart (Esquerda - 70%)

**Componente `RevenueTrendChart.tsx`:**
- Título: "Revenue Trend"
- **LineChart** com duas linhas:
  - Solid gold: Actual Revenue
  - Dashed gray: Forecast
- Tooltip customizado mostrando:
  - Month
  - Gross Revenue
  - Avg Revenue per Job
  - Percentage change
- Legenda: `● Revenue  ● Forecast`

**Data structure:**
```typescript
interface RevenuePoint {
  month: string;
  revenue: number;
  forecast: number;
  avgPerJob: number;
  change: number;
}
```

### 3.2 Operational Distribution (Direita - 30%)

**Componente `OperationalDonut.tsx`:**
- Título: "Operational Distribution"
- **PieChart** (donut) com:
  - Completed (verde/gold)
  - In Progress (slate)
  - Delayed (vermelho muted)
- Centro: Valor principal (ex: "68%")
- Legend lateral:
  - `● 68% Completed`
  - `● In Progress | 22`
  - `● Delayed | 10%`
- Footer: 
  - `68% Completed on time`
  - `32% Avg service duration`

---

## 4. Attention Required Section

**3 cards horizontais com CTAs:**

| Card | Valor | Ícone | CTA | Estilo |
|------|-------|-------|-----|--------|
| Delayed Jobs | 2 | Clock | "Review" | Gold outline |
| Pending Invoices | $4,200 | Invoice | "Bill Now" | Gold solid |
| Schedule Conflicts | 1 | Warning | "Resolve" | Red outline |

**Componente `AttentionCard.tsx`:**
```tsx
interface AttentionCardProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  value: string | number;
  ctaLabel: string;
  ctaVariant: 'gold' | 'gold-outline' | 'red-outline';
  onClick: () => void;
}
```

**Estilo:**
- Cards mais leves que KPIs (sem shadow pesada)
- CTA buttons alinhados ao centro
- Layout: Ícone | Título | Valor (direita) | CTA (abaixo)

---

## 5. Paleta de Cores (Conforme Referência)

```css
/* Gold accent (usado com moderação) */
--gold-primary: #C9A84B;
--gold-light: #F5ECD7;

/* Status */
--status-good: #22C55E;
--status-warning: #EAB308;
--status-danger: #EF4444;

/* Neutros */
--bg-page: #F6F7F9;
--bg-card: #FFFFFF;
--text-primary: #1A1A2E;
--text-muted: #6B7280;
```

---

## 6. Mudanças no Dashboard.tsx

### Estrutura Nova:
```tsx
<div className="p-4 space-y-4 bg-[#F6F7F9] min-h-screen">
  {/* Header Row */}
  <div className="flex items-center justify-between">
    <h1 className="text-xl font-semibold">Dashboard</h1>
    <PeriodSelector ... />
  </div>

  {/* KPI Row - Exatamente 4 cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <KPICard title="Revenue (MTD)" value="$12,480" trend={...} sparkline={...} />
    <KPICard title="On-Time Performance" value="85%" badge={{ text: 'Good', variant: 'success' }} />
    <KPICard title="In Progress" value="3" warning={{ count: 2, label: 'Delayed' }} />
    <KPICard title="Critical Alerts" value="0" subtitle="3 Evt" icon={AlertTriangle} />
  </div>

  {/* Charts Row - 70/30 */}
  <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
    <RevenueTrendChart data={revenueData} />
    <OperationalDonut data={operationalData} />
  </div>

  {/* Attention Required */}
  <div className="space-y-3">
    <h2 className="text-base font-medium text-muted-foreground">Attention Required</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AttentionCard title="Delayed Jobs" value={2} cta="Review" onClick={...} />
      <AttentionCard title="Pending Invoices" value="$4,200" cta="Bill Now" onClick={...} />
      <AttentionCard title="Schedule Conflicts" value={1} cta="Resolve" onClick={...} />
    </div>
  </div>
</div>
```

---

## 7. Queries de Dados

### KPIs:
- **Revenue (MTD)**: `invoices.status = 'paid' AND paid_at BETWEEN start AND end`
- **On-Time Performance**: `jobs.completed_at <= scheduled_end_time / total_completed`
- **In Progress**: `jobs.status = 'in_progress'`
- **Critical Alerts**: `absence_requests.status = 'pending' + delayed_jobs`

### Charts:
- **Revenue Trend**: Agregação mensal de `invoices.total` por `paid_at`
- **Operational Distribution**: Contagem de `jobs` por status

---

## 8. Remoção de Elementos Redundantes

| Remover | Motivo |
|---------|--------|
| 6 StatCards atuais | Substituídos por 4 KPIs únicos |
| BarChart (Jobs This Week) | Substituído por Revenue Trend |
| AreaChart (Revenue by Month) | Consolidado no Revenue Trend |
| AlertCard grid (4 cards) | Substituído por Attention Required (3 cards) |
| OverdueJobAlert | Integrado nos KPIs |
| CashPendingCard | Removido do Dashboard principal |

---

## 9. Mobile Responsiveness

- **< 768px (md)**: KPIs em 2 colunas, Charts empilhados, Attention 1 coluna
- **768-1280px (lg)**: KPIs 2x2, Charts lado a lado, Attention 3 colunas
- **> 1280px (xl)**: KPIs 4 colunas, Charts 70/30, Attention 3 colunas

---

## 10. Arquivos a Criar/Modificar

### Novos Arquivos:
1. `src/components/dashboard/KPICard.tsx`
2. `src/components/dashboard/MiniSparkline.tsx`
3. `src/components/dashboard/RevenueTrendChart.tsx`
4. `src/components/dashboard/OperationalDonut.tsx`
5. `src/components/dashboard/AttentionCard.tsx`

### Modificar:
1. `src/pages/Dashboard.tsx` - Reescrever estrutura completa
2. `src/i18n/translations.ts` - Adicionar novas keys (opcional)

---

## Visualização Final

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                    📅 Jan 1 - Jan 25   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐ │
│ │ $12,480  +12%  │ │ 85%   ● Good   │ │ 3              │ │ 0                  │ │
│ │ ~~~sparkline~~~│ │ On-Time        │ │ ⚠ 2 Delayed    │ │ 🔔 3 Evt           │ │
│ │ Revenue (MTD)  │ │ Week sp 6-14   │ │ In Progress    │ │ Critical Alerts    │ │
│ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ ┌────────────────────────────────┐│
│ │ Revenue Trend                              │ │ Operational Distribution       ││
│ │                                            │ │                                ││
│ │     $200k ─────────────────────            │ │ ● 68% Completed                ││
│ │     $150k ─────────────                    │ │ ● In Progress | 22             ││
│ │     $100k ───────                          │ │ ● Delayed | 10%                ││
│ │     $50k  ───                              │ │        ┌────────┐              ││
│ │          Jan Feb Mar Apr May Jun           │ │        │  68%   │              ││
│ │          ● Revenue  ● Forecast             │ │        └────────┘              ││
│ │                                            │ │ 68% on time  32% avg duration  ││
│ └────────────────────────────────────────────┘ └────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────────────────┤
│ Attention Required                                                               │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────┐  │
│ │ 🕐 Delayed Jobs    2 │ │ 📄 Pending Inv  $4.2k│ │ ⚠️ Schedule Conflicts   1│  │
│ │     [ Review ]       │ │     [ Bill Now ]     │ │     [ Resolve ]          │  │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo de Implementação

| Etapa | Descrição | Prioridade |
|-------|-----------|------------|
| 1 | Criar `KPICard.tsx` com sparkline | Alta |
| 2 | Criar `MiniSparkline.tsx` | Alta |
| 3 | Criar `RevenueTrendChart.tsx` | Alta |
| 4 | Criar `OperationalDonut.tsx` | Alta |
| 5 | Criar `AttentionCard.tsx` | Alta |
| 6 | Reescrever `Dashboard.tsx` | Alta |
| 7 | Adicionar queries para On-Time Performance | Média |
| 8 | Testar responsividade | Média |

