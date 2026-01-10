import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyPreferences {
  includeVisitsInReports: boolean;
  enableCashKeptByEmployee: boolean;
  autoSendCashReceipt: boolean;
  autoGenerateCashReceipt: boolean;
}

const defaultPreferences: CompanyPreferences = {
  includeVisitsInReports: false,
  enableCashKeptByEmployee: true,
  autoSendCashReceipt: false,
  autoGenerateCashReceipt: true,
};

export function useCompanyPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CompanyPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const companyId = user?.profile?.company_id;

  const fetchPreferences = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_estimate_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company preferences:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setPreferences({
          includeVisitsInReports: (data as any).include_visits_in_reports ?? false,
          enableCashKeptByEmployee: (data as any).enable_cash_kept_by_employee ?? true,
          autoSendCashReceipt: (data as any).auto_send_cash_receipt ?? false,
          autoGenerateCashReceipt: (data as any).auto_generate_cash_receipt ?? true,
        });
      }
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const updatePreferences = useCallback(async (newPreferences: Partial<CompanyPreferences>) => {
    if (!companyId) return false;

    setIsSaving(true);
    try {
      const updateData: Record<string, boolean> = {};
      
      if (newPreferences.includeVisitsInReports !== undefined) {
        updateData.include_visits_in_reports = newPreferences.includeVisitsInReports;
      }
      if (newPreferences.enableCashKeptByEmployee !== undefined) {
        updateData.enable_cash_kept_by_employee = newPreferences.enableCashKeptByEmployee;
      }
      if (newPreferences.autoSendCashReceipt !== undefined) {
        updateData.auto_send_cash_receipt = newPreferences.autoSendCashReceipt;
      }
      if (newPreferences.autoGenerateCashReceipt !== undefined) {
        updateData.auto_generate_cash_receipt = newPreferences.autoGenerateCashReceipt;
      }

      // Try to update existing record
      const { error: updateError } = await supabase
        .from('company_estimate_config')
        .update(updateData)
        .eq('company_id', companyId);

      if (updateError) {
        // If no rows were updated, try to insert
        const { error: insertError } = await supabase
          .from('company_estimate_config')
          .insert({
            company_id: companyId,
            ...updateData,
          });

        if (insertError) {
          console.error('Error inserting company preferences:', insertError);
          return false;
        }
      }

      // Update local state
      setPreferences(prev => ({
        ...prev,
        ...newPreferences,
      }));

      return true;
    } catch (err) {
      console.error('Error updating company preferences:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
