import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { notifyInvoiceGenerated } from '@/hooks/useNotifications';
import { formatSafeDate, formatDateTime } from '@/lib/dates';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PeriodSelector, DateRange } from '@/components/ui/period-selector';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { 
  CheckCircle, 
  FileText, 
  Loader2,
  DollarSign,
  Receipt
} from 'lucide-react';

interface CompletedService {
  id: string;
  clientId: string;
  clientName: string;
  address: string;
  date: string;
  duration: string;
  employeeName: string;
  jobType: string;
  completedAt: string;
}

const CompletedServices = () => {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  
  const [services, setServices] = useState<CompletedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [invoiceFrequency, setInvoiceFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const isAdmin = hasRole(['admin']);
  const isManager = hasRole(['manager']);
  // RULE: Only ADMIN can generate invoices
  const canGenerateInvoices = isAdmin;
  const canViewServices = isAdmin || isManager;

  // Use RPC to get pending invoices (single source of truth from database)
  const fetchCompletedServices = useCallback(async () => {
    try {
      // Call the RPC function - it handles role check internally
      const { data: pendingServices, error } = await supabase
        .rpc('get_completed_services_pending_invoices');
      
      if (error) {
        console.error('Error fetching pending invoices:', error);
        setIsLoading(false);
        return;
      }

      // Map the RPC response to our CompletedService interface
      const mappedServices: CompletedService[] = (pendingServices || []).map((job: any) => ({
        id: job.id,
        clientId: job.client_id,
        clientName: job.client_name || 'Unknown',
        address: job.address || 'No address',
        date: job.scheduled_date, // date-only string from database
        duration: job.duration_minutes ? `${job.duration_minutes / 60}h` : '2h',
        employeeName: job.cleaner_first_name && job.cleaner_last_name
          ? `${job.cleaner_first_name} ${job.cleaner_last_name}`.trim()
          : job.cleaner_first_name || job.cleaner_last_name || 'Unassigned',
        jobType: job.job_type || 'Standard Clean',
        completedAt: job.completed_at,
      }));
      
      setServices(mappedServices);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchCompletedServices:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCompletedServices();
    }
  }, [user, fetchCompletedServices]);

  // Filter by search and period
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Search filter
      const matchesSearch = service.clientName.toLowerCase().includes(search.toLowerCase()) ||
        service.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        service.address.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Period filter
      if (period.startDate && period.endDate && service.date) {
        try {
          const serviceDate = parseISO(service.date);
          if (!isWithinInterval(serviceDate, { start: period.startDate, end: period.endDate })) {
            return false;
          }
        } catch {
          // Invalid date
        }
      }
      
      return true;
    });
  }, [services, search, period]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedServices(filteredServices.map(s => s.id));
    } else {
      setSelectedServices([]);
    }
  };

  const handleSelectService = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const handleGenerateInvoices = async () => {
    // RULE: Only ADMIN can generate invoices
    if (!isAdmin) {
      toast.error('Only administrators can generate invoices');
      return;
    }

    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setIsGenerating(true);

    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }

      if (!companyId) {
        toast.error('Unable to identify company');
        setIsGenerating(false);
        return;
      }

      const { data: estimateConfig } = await supabase
        .from('company_estimate_config')
        .select('default_hourly_rate, tax_rate')
        .eq('company_id', companyId)
        .single();

      const hourlyRate = estimateConfig?.default_hourly_rate || 35;
      const taxRate = estimateConfig?.tax_rate || 13;

      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      let invoicesCreated = 0;
      let invoicesSkipped = 0;

      for (const serviceId of selectedServices) {
        const service = services.find(s => s.id === serviceId);
        if (!service) continue;

        // DEFENSE-IN-DEPTH: Check if job was paid in cash (receipt already generated)
        const { data: jobPaymentData } = await supabase
          .from('jobs')
          .select('payment_method')
          .eq('id', serviceId)
          .maybeSingle();
        
        if (jobPaymentData?.payment_method === 'cash') {
          console.log(`Skipping job ${serviceId} - cash payment (receipt already generated)`);
          invoicesSkipped++;
          continue;
        }

        // IDEMPOTENCY CHECK: Verify invoice doesn't already exist before inserting
        const { data: existingInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('job_id', serviceId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (existingInvoice) {
          console.log(`Skipping job ${serviceId} - invoice already exists`);
          invoicesSkipped++;
          continue;
        }

        const durationHours = parseFloat(service.duration.replace(/[^0-9.]/g, '')) || 2;
        const subtotal = durationHours * hourlyRate;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        const invoiceNumber = `INV-${format(new Date(), 'yyyyMMdd')}-${timestamp.toString().slice(-4)}${random}${invoicesCreated}`;

        const { data: jobData } = await supabase
          .from('jobs')
          .select('location_id, cleaner_id')
          .eq('id', serviceId)
          .single();

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            client_id: service.clientId,
            job_id: serviceId,
            cleaner_id: jobData?.cleaner_id || null,
            location_id: jobData?.location_id || null,
            invoice_number: invoiceNumber,
            service_date: service.date,
            service_duration: service.duration,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            status: 'draft',
            due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          })
          .select('id')
          .single();

        if (invoiceError) {
          // Handle unique constraint violation gracefully
          if (invoiceError.code === '23505') {
            console.log(`Invoice already exists for job ${serviceId}`);
            invoicesSkipped++;
            continue;
          }
          console.error('Error creating invoice:', invoiceError);
          continue;
        }

        // Notify admin about the generated invoice
        await notifyInvoiceGenerated(invoiceNumber, service.clientName, total, invoiceData.id);

        invoicesCreated++;
      }

      // Report results including any skipped
      if (invoicesSkipped > 0) {
        toast.success(`${invoicesCreated} invoice(s) generated, ${invoicesSkipped} already existed`);
      } else {
        toast.success(`${invoicesCreated} invoice(s) generated successfully`);
      }
      setShowGenerateDialog(false);
      setSelectedServices([]);
      await fetchCompletedServices();
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast.error('Failed to generate invoices');
    } finally {
      setIsGenerating(false);
    }
  };

  const columns: Column<CompletedService>[] = [
    {
      key: 'select',
      header: 'Select',
      render: (service) => (
        <Checkbox 
          checked={selectedServices.includes(service.id)}
          onCheckedChange={(checked) => handleSelectService(service.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (service) => (
        <div>
          <p className="font-medium">{service.clientName}</p>
          <p className="text-xs text-muted-foreground">{service.address}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Service Date',
      render: (service) => formatSafeDate(service.date, 'MMM d, yyyy'),
    },
    {
      key: 'jobType',
      header: 'Service Type',
    },
    {
      key: 'duration',
      header: 'Duration',
    },
    {
      key: 'employeeName',
      header: 'Cleaner',
    },
    {
      key: 'completedAt',
      header: 'Completed',
      render: (service) => formatDateTime(service.completedAt, 'MMM d, yyyy HH:mm') || '-',
    },
  ];

  const totalServices = filteredServices.length;
  const selectedCount = selectedServices.length;
  const estimatedTotal = selectedServices.reduce((acc, id) => {
    const service = services.find(s => s.id === id);
    if (!service) return acc;
    const hours = parseFloat(service.duration.replace(/[^0-9.]/g, '')) || 2;
    return acc + (hours * 35);
  }, 0);

  if (isLoading) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewServices) {
    return (
      <div className="p-2 lg:p-3">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <p className="text-destructive">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Completed Services"
          description="Select completed services to generate invoices"
        />
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
                <p className="text-2xl font-bold">{totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{selectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Total</p>
                <p className="text-2xl font-bold">${estimatedTotal.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedServices.length === filteredServices.length && filteredServices.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">Select All</span>
        </div>
        <div className="flex items-center gap-4">
          <SearchInput 
            placeholder="Search services..."
            value={search}
            onChange={setSearch}
            className="max-w-sm"
          />
          {/* RULE: Only ADMIN can generate invoices */}
          {isAdmin ? (
            <Button 
              onClick={() => setShowGenerateDialog(true)}
              disabled={selectedServices.length === 0}
              className="gap-2"
            >
              <Receipt className="h-4 w-4" />
              Generate Invoices ({selectedCount})
            </Button>
          ) : (
            <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
              Only administrators can generate invoices
            </div>
          )}
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={filteredServices}
        emptyMessage="No completed services pending invoices."
      />

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Generate Invoices
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              You are about to generate invoices for <strong>{selectedCount}</strong> selected service(s).
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Grouping (optional)</label>
              <Select value={invoiceFrequency} onValueChange={(v: 'weekly' | 'biweekly' | 'monthly') => setInvoiceFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Individual Invoices</SelectItem>
                  <SelectItem value="biweekly">Group by Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Group by Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Currently generating individual invoices per service.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Services selected:</span>
                <span className="font-medium">{selectedCount}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Estimated total:</span>
                <span className="font-medium">${estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateInvoices} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Invoices'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompletedServices;
