import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Receipt, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generatePaymentReceiptPdf } from '@/utils/pdfGenerator';

interface CashJobWithoutReceipt {
  id: string;
  client_id: string;
  client_name: string;
  cleaner_id: string | null;
  cleaner_name: string;
  scheduled_date: string;
  payment_amount: number;
  duration_minutes: number | null;
  job_type: string | null;
}

interface GenerateReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onReceiptGenerated: () => void;
}

const GenerateReceiptModal = ({ open, onClose, onReceiptGenerated }: GenerateReceiptModalProps) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;
  
  const [jobs, setJobs] = useState<CashJobWithoutReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const fetchCashJobsWithoutReceipts = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Fetch completed cash jobs that don't have a receipt
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          client_id,
          cleaner_id,
          scheduled_date,
          payment_amount,
          duration_minutes,
          job_type,
          clients(name),
          profiles:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .eq('payment_method', 'cash')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      // Filter out jobs that already have receipts
      const jobIds = (data || []).map(j => j.id);
      
      const { data: existingReceipts } = await supabase
        .from('payment_receipts')
        .select('job_id')
        .in('job_id', jobIds);

      const existingJobIds = new Set((existingReceipts || []).map(r => r.job_id));

      const jobsWithoutReceipts = (data || [])
        .filter(j => !existingJobIds.has(j.id))
        .map(j => ({
          id: j.id,
          client_id: j.client_id,
          client_name: (j.clients as any)?.name || '-',
          cleaner_id: j.cleaner_id,
          cleaner_name: (j.profiles as any)
            ? `${(j.profiles as any).first_name || ''} ${(j.profiles as any).last_name || ''}`.trim() || '-'
            : '-',
          scheduled_date: j.scheduled_date,
          payment_amount: j.payment_amount || 0,
          duration_minutes: j.duration_minutes,
          job_type: j.job_type,
        }));

      setJobs(jobsWithoutReceipts);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCashJobsWithoutReceipts();
    }
  }, [open, companyId]);

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.client_name.toLowerCase().includes(query) ||
      job.cleaner_name.toLowerCase().includes(query)
    );
  });

  const handleGenerateReceipt = async (job: CashJobWithoutReceipt) => {
    if (!companyId || !user?.id) return;

    setGeneratingFor(job.id);
    
    try {
      // Fetch company info for the receipt
      const { data: company } = await supabase
        .from('companies')
        .select('trade_name, legal_name, address, city, province, postal_code, phone, email')
        .eq('id', companyId)
        .single();

      // Fetch company branding
      const { data: branding } = await supabase
        .from('company_branding')
        .select('logo_url, primary_color')
        .eq('company_id', companyId)
        .maybeSingle();

      // Generate receipt number
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const receiptNumber = `RCP-${timestamp}-${randomPart}`;

      // Prepare company profile for PDF (matching CompanyProfile interface)
      const companyProfile = {
        companyName: company?.trade_name || 'Company',
        legalName: company?.legal_name || '',
        address: company?.address || '',
        city: company?.city || '',
        province: company?.province || '',
        postalCode: company?.postal_code || '',
        phone: company?.phone || '',
        email: company?.email || '',
        website: '',
        businessNumber: '',
        gstHstNumber: '',
      };

      // Prepare branding data (matching CompanyBranding interface)
      const brandingData = {
        logoUrl: branding?.logo_url || null,
        primaryColor: branding?.primary_color || '#3b82f6',
      };

      // Generate receipt HTML
      const receiptHtml = generatePaymentReceiptPdf(
        {
          receiptNumber,
          clientName: job.client_name,
          serviceDate: job.scheduled_date,
          serviceDescription: job.job_type === 'visit' ? 'Site Visit' : 'Cleaning Service',
          amount: job.payment_amount,
          taxAmount: 0,
          total: job.payment_amount,
          paymentMethod: 'cash',
          cleanerName: job.cleaner_name,
        },
        companyProfile,
        brandingData
      );

      // Insert receipt
      const { error } = await supabase
        .from('payment_receipts')
        .insert({
          company_id: companyId,
          job_id: job.id,
          client_id: job.client_id,
          cleaner_id: job.cleaner_id,
          receipt_number: receiptNumber,
          payment_method: 'cash',
          amount: job.payment_amount,
          tax_amount: 0,
          total: job.payment_amount,
          service_date: job.scheduled_date,
          service_description: job.job_type === 'visit' ? 'Site Visit' : 'Cleaning Service',
          receipt_html: receiptHtml,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success(`Receipt ${receiptNumber} generated successfully`);
      
      // Remove from list
      setJobs(prev => prev.filter(j => j.id !== job.id));
      onReceiptGenerated();
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Generate Receipt for Cash Jobs
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client or cleaner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {jobs.length === 0 
                    ? 'All cash jobs have receipts generated'
                    : 'No jobs match your search'}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Cleaner</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.client_name}</TableCell>
                        <TableCell>{job.cleaner_name}</TableCell>
                        <TableCell>{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">${job.payment_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateReceipt(job)}
                            disabled={generatingFor === job.id}
                          >
                            {generatingFor === job.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              'Generate'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateReceiptModal;
