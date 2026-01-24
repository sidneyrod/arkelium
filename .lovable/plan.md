

# Plano: Cards com Cores Transparentes e Elegantes

## Objetivo
Reduzir a opacidade dos backgrounds dos cards de **25%** para **10-12%**, criando um visual mais refinado e moderno estilo "glassmorphism".

---

## 1. Atualizar Month View (src/pages/Schedule.tsx)

**Linha ~1707-1709** - Reduzir opacidade de `/25` para `/10`:

```tsx
// DE:
isVisit 
  ? "bg-purple-500/25 hover:bg-purple-500/35 border border-purple-500/40"
  : "bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/40"

// PARA:
isVisit 
  ? "bg-purple-500/10 hover:bg-purple-500/18 border border-purple-500/25"
  : "bg-emerald-500/10 hover:bg-emerald-500/18 border border-emerald-500/25"
```

---

## 2. Atualizar CSS Global (src/index.css)

### Service Cards (linhas 265-296):

```css
/* DE: */
.schedule-card-service {
  background: linear-gradient(135deg, hsl(var(--schedule-service-bg) / 0.10) 0%, hsl(var(--schedule-service-bg) / 0.05) 100%);
  border-color: hsl(var(--schedule-service-border) / 0.25);
}

/* PARA (mais transparente): */
.schedule-card-service {
  background: linear-gradient(135deg, hsl(var(--schedule-service-bg) / 0.06) 0%, hsl(var(--schedule-service-bg) / 0.02) 100%);
  border-color: hsl(var(--schedule-service-border) / 0.18);
}

.schedule-card-service:hover {
  background: linear-gradient(135deg, hsl(var(--schedule-service-bg) / 0.12) 0%, hsl(var(--schedule-service-bg) / 0.05) 100%);
  border-color: hsl(var(--schedule-service-border) / 0.30);
}
```

### Visit Cards (linhas 299-332):

```css
/* DE: */
.schedule-card-visit {
  background: linear-gradient(135deg, hsl(270 60% 60% / 0.10) 0%, hsl(270 60% 60% / 0.04) 100%);
  border-color: hsl(270 60% 60% / 0.25);
}

/* PARA (mais transparente): */
.schedule-card-visit {
  background: linear-gradient(135deg, hsl(270 60% 60% / 0.06) 0%, hsl(270 60% 60% / 0.02) 100%);
  border-color: hsl(270 60% 60% / 0.18);
}

.schedule-card-visit:hover {
  background: linear-gradient(135deg, hsl(270 60% 60% / 0.12) 0%, hsl(270 60% 60% / 0.05) 100%);
  border-color: hsl(270 60% 60% / 0.30);
}
```

---

## 3. Atualizar statusConfig (src/pages/Schedule.tsx)

**Linhas 110-153** - Reduzir opacidade dos `cardBgClass`:

| Status | Atual | Novo |
|--------|-------|------|
| scheduled | `bg-info/10 hover:bg-info/16` | `bg-info/6 hover:bg-info/12` |
| in-progress | `bg-warning/12 hover:bg-warning/18` | `bg-warning/8 hover:bg-warning/14` |
| completed | `bg-success/12 hover:bg-success/18` | `bg-success/8 hover:bg-success/14` |
| cancelled | `bg-muted/10 hover:bg-muted/16` | `bg-muted/6 hover:bg-muted/12` |

---

## Resultado Visual Esperado

- Cards mais leves e arejados
- Bordas mais suaves e menos intrusivas
- Efeito hover mais sutil e elegante
- Melhor harmonia com o design premium do sistema
- Mantém diferenciação visual entre Service (verde) e Visit (roxo)

