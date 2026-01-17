-- ============================================
-- ENTERPRISE GOVERNANCE PACKAGE
-- Data Integrity & Audit Immutability
-- ============================================

-- 1. FOREIGN KEYS WITH ON DELETE RESTRICT
-- ============================================

-- 1.1 jobs.organization_id → organizations.id
ALTER TABLE public.jobs
ADD CONSTRAINT fk_jobs_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
ON DELETE RESTRICT;

-- 1.2 cash_collections.organization_id → organizations.id
ALTER TABLE public.cash_collections
ADD CONSTRAINT fk_cash_collections_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
ON DELETE RESTRICT;

-- 1.3 jobs.service_catalog_id → service_catalog.id
ALTER TABLE public.jobs
ADD CONSTRAINT fk_jobs_service_catalog
FOREIGN KEY (service_catalog_id) REFERENCES public.service_catalog(id)
ON DELETE RESTRICT;

-- 2. ORGANIZATION ↔ COMPANY VALIDATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_organization_company_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_org_id uuid;
BEGIN
  -- Get the organization_id from the company
  SELECT organization_id INTO v_company_org_id
  FROM public.companies
  WHERE id = NEW.company_id;
  
  -- Validation rules
  IF v_company_org_id IS NOT NULL THEN
    -- Company belongs to an organization: record MUST have same organization_id
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'organization_id is required when company belongs to a Business Group';
    END IF;
    IF NEW.organization_id != v_company_org_id THEN
      RAISE EXCEPTION 'organization_id must match the company''s organization (expected: %, got: %)', 
        v_company_org_id, NEW.organization_id;
    END IF;
  ELSE
    -- Company has no organization: record MUST have NULL organization_id
    IF NEW.organization_id IS NOT NULL THEN
      RAISE EXCEPTION 'organization_id must be NULL when company does not belong to a Business Group';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to jobs table
CREATE TRIGGER trigger_validate_jobs_organization
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.validate_organization_company_match();

-- Apply trigger to cash_collections table
CREATE TRIGGER trigger_validate_cash_collections_organization
BEFORE INSERT OR UPDATE ON public.cash_collections
FOR EACH ROW
EXECUTE FUNCTION public.validate_organization_company_match();

-- 3. SERVICE CATALOG ↔ COMPANY VALIDATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_service_catalog_company_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_catalog_company_id uuid;
BEGIN
  -- Skip if no service_catalog_id is set
  IF NEW.service_catalog_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the company_id from the service catalog
  SELECT company_id INTO v_catalog_company_id
  FROM public.service_catalog
  WHERE id = NEW.service_catalog_id;
  
  -- Validate match
  IF v_catalog_company_id IS NULL THEN
    RAISE EXCEPTION 'Invalid service_catalog_id: record not found';
  END IF;
  
  IF v_catalog_company_id != NEW.company_id THEN
    RAISE EXCEPTION 'service_catalog_id must belong to the same company (expected company: %, catalog company: %)', 
      NEW.company_id, v_catalog_company_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to jobs table
CREATE TRIGGER trigger_validate_jobs_service_catalog
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.validate_service_catalog_company_match();

-- 4. CONFIRM AUDIT IMMUTABILITY (already exists, just document)
-- ============================================
-- The trigger 'audit_immutability' on 'activity_logs' already blocks UPDATE/DELETE
-- Function: prevent_audit_modification()
-- This ensures enterprise-grade audit trail compliance