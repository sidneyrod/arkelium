

# Plano: Atualizar Logo Arkelium com Transparência

## Objetivo
Substituir o logo atual pelo novo **LogaPrincipal.png** que já possui fundo transparente.

---

## 1. Substituir o arquivo do logo

**Arquivo**: `src/assets/arkelium-logo.png`

- Substituir pelo arquivo `user-uploads://LogaPrincipal.png`
- O novo logo tem fundo transparente (PNG com alpha channel)

---

## 2. Ajustar drop-shadow para melhor integração

**Arquivo**: `src/components/auth/AuthLayout.tsx`

Atualizar o estilo do logo para remover ou ajustar o drop-shadow, já que o novo logo já possui sombra incorporada:

```tsx
// DE:
style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}

// PARA (sombra mais sutil para não duplicar):
style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
```

---

## 3. Verificar ArkeliumIcon component

**Arquivo**: `src/components/ArkeliumIcon.tsx`

Este componente também usa o logo - ele será automaticamente atualizado com o novo arquivo.

---

## Resultado Esperado

- Logo dourado elegante sobre fundo dark blue-gray
- Sem quadrado branco ou fundo indesejado
- Sombra sutil integrada naturalmente ao design
- Visual premium enterprise-grade

