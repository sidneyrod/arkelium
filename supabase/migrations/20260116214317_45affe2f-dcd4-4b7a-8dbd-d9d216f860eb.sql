-- =====================================================
-- ENTERPRISE SERVICE EXECUTION ENGINE - PHASE 1
-- Organizations, Company Activities, Service Catalog
-- =====================================================

-- 1. Create organizations table (Business Groups)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Create company_activities table
CREATE TABLE IF NOT EXISTS public.company_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  activity_code TEXT NOT NULL,
  activity_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, activity_code)
);

-- 4. Create service_catalog table
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  activity_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_code TEXT,
  billable_default BOOLEAN DEFAULT true,
  default_duration_minutes INTEGER DEFAULT 120,
  default_rate NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add organization_id to companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 6. Add enterprise fields to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'billable_service',
  ADD COLUMN IF NOT EXISTS activity_code TEXT DEFAULT 'cleaning',
  ADD COLUMN IF NOT EXISTS service_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billable_amount NUMERIC(10,2);

-- 7. Add organization_id to cash_collections
ALTER TABLE public.cash_collections
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 8. Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for organizations
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Admins can insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 10. RLS Policies for organization_members
CREATE POLICY "Users can view org members in their orgs"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Admins can manage org members"
  ON public.organization_members FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 11. RLS Policies for company_activities
CREATE POLICY "Users can view company activities"
  ON public.company_activities FOR SELECT
  USING (user_has_access_to_company(company_id));

CREATE POLICY "Admins can manage company activities"
  ON public.company_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND company_id = company_activities.company_id 
      AND role = 'admin'
      AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 12. RLS Policies for service_catalog
CREATE POLICY "Users can view service catalog"
  ON public.service_catalog FOR SELECT
  USING (user_has_access_to_company(company_id));

CREATE POLICY "Admins can manage service catalog"
  ON public.service_catalog FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND company_id = service_catalog.company_id 
      AND role = 'admin'
      AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 13. Create updated_at triggers for new tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_activities_updated_at
  BEFORE UPDATE ON public.company_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_activities_company ON public.company_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_company_activities_code ON public.company_activities(activity_code);
CREATE INDEX IF NOT EXISTS idx_service_catalog_company ON public.service_catalog(company_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_activity ON public.service_catalog(activity_code);
CREATE INDEX IF NOT EXISTS idx_jobs_organization ON public.jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_operation_type ON public.jobs(operation_type);
CREATE INDEX IF NOT EXISTS idx_jobs_activity_code ON public.jobs(activity_code);
CREATE INDEX IF NOT EXISTS idx_companies_organization ON public.companies(organization_id);