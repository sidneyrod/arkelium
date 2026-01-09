import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ExternalLink, Clock, DollarSign, Banknote, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobDetail } from '@/hooks/useWorkEarnings';
import { format } from 'date-fns';
import { useCompanyPreferences } from '@/hooks/useCompanyPreferences';

interface CleanerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cleanerName: string;
  cleanerId: string;
  onFetchDetails: (cleanerId: string) => Promise<JobDetail[]>;
}

export function CleanerDetailModal({
  open,
  onOpenChange,
  cleanerName,
  cleanerId,
  onFetchDetails,
}: CleanerDetailModalProps) {
  const [details, setDetails] = useState<JobDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { preferences } = useCompanyPreferences();
  const enableCashKept = preferences.enableCashKeptByEmployee;

  useEffect(() => {
    if (open && cleanerId) {
      const loadDetails = async () => {
        setIsLoading(true);
        try {
          const data = await onFetchDetails(cleanerId);
          setDetails(data);
        } catch (error) {
          console.error('Error fetching details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadDetails();
    }
  }, [open, cleanerId, onFetchDetails]);

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200' },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      settled: { label: 'Settled', className: 'bg-green-100 text-green-800 border-green-200' },
      disputed: { label: 'Disputed', className: 'bg-red-100 text-red-800 border-red-200' },
    };
    
    const variant = variants[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    
    return (
      <Badge variant="outline" className={cn('text-[10px] font-medium', variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  const getCashHandlingLabel = (handling: string | null) => {
    if (!handling) return '-';
    if (handling === 'kept_by_cleaner') return 'Kept';
    if (handling === 'delivered_to_office') return 'Delivered';
    return handling;
  };

  // Calculate totals
  const totals = details.reduce((acc, job) => ({
    hours: acc.hours + job.hoursWorked,
    serviceAmount: acc.serviceAmount + job.serviceAmount,
  }), { hours: 0, serviceAmount: 0 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-base font-medium">
            Job Details — {cleanerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : details.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No jobs found for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase tracking-wide">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right w-[80px]">Duration</TableHead>
                  <TableHead className="text-right w-[70px]">Hours</TableHead>
                  <TableHead className="text-right w-[90px]">Amount</TableHead>
                  <TableHead className="w-[80px]">Payment</TableHead>
                  {enableCashKept && <TableHead className="w-[70px]">Cash</TableHead>}
                  {enableCashKept && <TableHead className="w-[80px]">Status</TableHead>}
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((job) => (
                  <TableRow key={job.id} className="text-[12px]">
                    <TableCell className="font-medium">
                      {format(new Date(job.jobDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{job.clientName}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">{job.plannedDuration}m</span>
                      {job.actualDuration && job.actualDuration !== job.plannedDuration && (
                        <span className={cn(
                          'ml-1',
                          job.actualDuration > job.plannedDuration ? 'text-amber-600' : 'text-green-600'
                        )}>
                          → {job.actualDuration}m
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {job.hoursWorked.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${job.serviceAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-muted-foreground">
                        {job.paymentMethod || '-'}
                      </span>
                    </TableCell>
                    {enableCashKept && (
                      <TableCell>
                        {job.cashHandling ? (
                          <span className={cn(
                            'text-[10px] font-medium',
                            job.cashHandling === 'kept_by_cleaner' ? 'text-amber-600' : 'text-green-600'
                          )}>
                            {getCashHandlingLabel(job.cashHandling)}
                          </span>
                        ) : '-'}
                      </TableCell>
                    )}
                    {enableCashKept && (
                      <TableCell>
                        {getStatusBadge(job.cashStatus)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(`/schedule?job=${job.id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/30 font-medium text-[12px]">
                  <TableCell colSpan={3} className="text-right">
                    Total ({details.length} jobs)
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.hours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${totals.serviceAmount.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={enableCashKept ? 4 : 2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-3 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
