
Objetivo: eliminar 100% o “sumir por 1–2s” do logo ao navegar de **/login → /forgot-password** (e também entre outras telas públicas), mantendo o logo sempre renderizado e constante.

Diagnóstico (causa provável)
- Hoje, cada página pública (Login/ForgotPassword/ResetPassword) renderiza seu próprio `<AuthLayout>`:
  - `src/pages/Login.tsx` (envolve conteúdo com `<AuthLayout>`)
  - `src/pages/ForgotPassword.tsx`
  - `src/pages/ResetPassword.tsx`
- Ao trocar a rota, o React Router desmonta a página inteira anterior e monta a nova. Isso faz o `<AuthLayout>` (incluindo o `<img>` do logo) sair do DOM e entrar de novo.
- Mesmo com preload (`new Image()` em `src/components/auth/AuthLayout.tsx`), o navegador pode demorar a “pintar” o logo novamente (decode/raster/filter), gerando a impressão de desaparecimento.

Solução (arquitetura correta para “nunca desaparecer”)
1) Tornar o `AuthLayout` um “shell” persistente de rotas públicas usando rotas aninhadas (Outlet)
- Em vez de cada página importar `<AuthLayout>`, vamos renderizar o layout UMA vez no roteamento e trocar somente o miolo (o card/form).
- Resultado: ao navegar /login ↔ /forgot-password, apenas o conteúdo do formulário troca; o painel com logo nunca desmonta, então não existe janela onde ele “some”.

Passos de implementação (arquivos e mudanças)
A) Criar um layout de rotas públicas que mantém o AuthLayout constante
- Criar um componente novo, por exemplo:
  - `src/components/auth/PublicAuthLayout.tsx`
- Conteúdo:
  - Renderiza `<AuthLayout>` e dentro dele um `<Outlet />` (do `react-router-dom`).
  - Esse componente não faz lógica de auth; ele só “segura” o layout.

B) Refatorar o roteamento para usar rotas aninhadas com o layout persistente
- Editar `src/App.tsx`:
  - Substituir:
    - `<Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />`
    - `<Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />`
    - `<Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />`
  - Por algo neste formato:
    - `<Route element={<PublicRoute><PublicAuthLayout /></PublicRoute>}>`
      - `<Route path="/login" element={<Login />} />`
      - `<Route path="/forgot-password" element={<ForgotPassword />} />`
      - `<Route path="/reset-password" element={<ResetPassword />} />`
    - `</Route>`
  - Assim, ao mudar entre essas rotas, o `PublicAuthLayout` continua montado.

C) Ajustar as páginas públicas para não renderizarem mais AuthLayout (viram “somente o card”)
- Editar:
  - `src/pages/Login.tsx`
  - `src/pages/ForgotPassword.tsx`
  - `src/pages/ResetPassword.tsx`
- Mudanças:
  - Remover `import AuthLayout from '@/components/auth/AuthLayout'`
  - Remover o wrapper `<AuthLayout> ... </AuthLayout>`
  - Manter apenas o conteúdo interno (o card transparente), retornando diretamente o `<div className="w-full ...">...</div>`
- Resultado:
  - O layout fica 100% centralizado no `PublicAuthLayout`, e cada página só fornece o “miolo”.

D) “Hardening” do carregamento do logo (para evitar qualquer atraso até mesmo no primeiro load)
- Editar `src/components/auth/AuthLayout.tsx`:
  - No `<img>` do logo (desktop e mobile), adicionar atributos para priorizar o carregamento/pintura:
    - `loading="eager"`
    - `decoding="sync"` (ou manter default se preferir; mas “sync” ajuda a evitar paint atrasado)
    - `fetchPriority="high"`
  - Manter o preload existente (`new Image()`), e opcionalmente chamar `preloadLogo.decode?.().catch(...)` para “forçar decode” antecipado quando suportado.

Critérios de aceite (como vamos validar que ficou perfeito)
1) No desktop (>=1024px):
- Abrir `/login` e clicar em “Forgot Password?”:
  - O logo no painel esquerdo não pode desaparecer em nenhum momento (nem 1 frame perceptível).
2) No mobile/tablet (<1024px):
- O logo do header também não pode piscar ao navegar entre telas públicas.
3) Verificar também:
- `/forgot-password` → “Back to login”
- `/forgot-password` → `/reset-password` (quando aplicável)
4) Garantir que não voltamos com barras de rolagem no login:
- Confirmar que `AuthLayout` continua com `overflow-hidden` no container raiz e não adicionamos `overflow-auto` novamente.

Risco/impacto
- É uma refatoração bem localizada (roteamento + 3 páginas públicas), sem mexer no fluxo de autenticação em si.
- Benefício adicional: o seletor de idioma e o fundo também ficam totalmente estáveis ao trocar as telas públicas.

Arquivos que serão mexidos
- Novo: `src/components/auth/PublicAuthLayout.tsx` (nome pode variar)
- Editar: `src/App.tsx`
- Editar: `src/pages/Login.tsx`
- Editar: `src/pages/ForgotPassword.tsx`
- Editar: `src/pages/ResetPassword.tsx`
- Editar: `src/components/auth/AuthLayout.tsx` (atributos do `<img>` para priorização)
