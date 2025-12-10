import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, FileSpreadsheet, FileCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditEntry } from '@/hooks/useAuditLog';
import type { Visit } from '@/pages/VisitHistory';

interface ConvertVisitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: Visit;
  convertType: 'job' | 'estimate' | 'contract';
  onSuccess: () => void;
}

const ConvertVisitModal = ({ open, onOpenChange, visit, convertType, onSuccess }: ConvertVisitModalProps) => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const isAdmin = hasRole(['admin']);

  const getConvertDetails = () => {
    switch (convertType) {
      case 'job':
        return {
          icon: Briefcase,
          title: 'Convert to Job',
          description: 'This will create a new cleaning job with the same client, location, employee, and notes from this visit. The job will be scheduled for the same date and time.',
          buttonText: 'Create Job',
        };
      case 'estimate':
        return {
          icon: FileSpreadsheet,
          title: 'Convert to Estimate',
          description: 'This will open the Estimate calculator with the client information pre-filled from this visit. You can then customize the estimate details.',
          buttonText: 'Create Estimate',
        };
      case 'contract':
        return {
          icon: FileCheck,
          title: 'Convert to Contract',
          description: 'This will create a new service contract for this client. Only administrators can perform this action.',
          buttonText: 'Create Contract',
        };
    }
  };

  const details = getConvertDetails();
  const IconComponent = details.icon;

  const handleConvert = async () => {
    try {
      setIsLoading(true);
      
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data } = await supabase.rpc('get_user_company_id');
        companyId = data;
      }

      if (convertType === 'job') {
        // Create a new job (cleaning type) from the visit data
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            company_id: companyId,
            client_id: visit.clientId,
            location_id: visit.locationId,
            cleaner_id: visit.employeeId || null,
            scheduled_date: visit.date,
            start_time: visit.time,
            duration_minutes: 120, // Default 2 hours
            job_type: 'regular',
            status: 'scheduled',
            notes: `Converted from visit: ${visit.visitPurpose || 'Business Visit'}\n\n${visit.notes || ''}`.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        await logAuditEntry({
          action: 'job_created',
          entityType: 'job',
          entityId: data.id,
          details: {
            description: 'Job created from visit conversion',
            sourceVisitId: visit.id,
          }
        }, user?.id, companyId);

        toast.success('Job created successfully');
        navigate('/schedule');
      } else if (convertType === 'estimate') {
        // Navigate to calculator with pre-filled data
        await logAuditEntry({
          action: 'job_updated',
          entityType: 'visit',
          entityId: visit.id,
          details: {
            description: 'Visit converted to estimate'
          }
        }, user?.id, companyId);

        toast.success('Redirecting to Estimate calculator...');
        // Store visit data in sessionStorage for the calculator to pick up
        sessionStorage.setItem('visitToEstimate', JSON.stringify({
          clientName: visit.clientName,
          clientEmail: visit.clientEmail,
          clientPhone: visit.clientPhone,
          address: visit.address,
          notes: visit.notes,
        }));
        navigate('/calculator');
      } else if (convertType === 'contract') {
        if (!isAdmin) {
          toast.error('Only administrators can create contracts');
          return;
        }

        // Generate contract number
        const timestamp = Date.now().toString(36).toUpperCase();
        const contractNumber = `CNT-${timestamp}`;

        // Create contract
        const { data, error } = await supabase
          .from('contracts')
          .insert({
            company_id: companyId,
            client_id: visit.clientId,
            location_id: visit.locationId,
            contract_number: contractNumber,
            status: 'draft',
            notes: `Created from visit: ${visit.visitPurpose || 'Business Visit'}\n\n${visit.notes || ''}`.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        await logAuditEntry({
          action: 'contract_created',
          entityType: 'contract',
          entityId: data.id,
          details: {
            description: 'Contract created from visit conversion',
            sourceVisitId: visit.id,
          }
        }, user?.id, companyId);

        toast.success('Contract created successfully');
        navigate('/contracts');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error converting visit:', error);
      toast.error(`Failed to convert visit to ${convertType}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>{details.title}</DialogTitle>
          </div>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm"><strong>Client:</strong> {visit.clientName}</p>
            <p className="text-sm"><strong>Address:</strong> {visit.address}</p>
            <p className="text-sm"><strong>Date:</strong> {visit.date}</p>
            <p className="text-sm"><strong>Employee:</strong> {visit.employeeName}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {details.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertVisitModal;
