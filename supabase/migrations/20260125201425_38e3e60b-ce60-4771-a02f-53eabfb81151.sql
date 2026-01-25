-- Criar tabela de configurações globais
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem gerenciar (ALL operations)
CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL
USING (
  public.is_super_admin_safe()
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin' 
    AND user_roles.status = 'active'
  )
);

-- Política: Todos podem visualizar
CREATE POLICY "Anyone can view app settings"
ON public.app_settings FOR SELECT
USING (true);

-- Inserir nome inicial do grupo
INSERT INTO public.app_settings (key, value) 
VALUES ('business_group_name', 'Business Group');