import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DatePickerDialog } from '@/components/ui/date-picker-dialog';
import { DateRange } from 'react-day-picker';
import { 
  Briefcase, 
  Clock, 
  DollarSign, 
  Banknote,
  RefreshCw,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useWorkEarnings, CleanerWorkSummary } from '@/hooks/useWorkEarnings';
import { CleanerDetailModal } from '@/components/work-earnings/CleanerDetailModal';
import { ExportReportButton } from '@/components/work-earnings/ExportReportButton';
import { FinancialInfoBanner } from '@/components/financial/FinancialInfoBanner';

const WorkEarningsSummary = () => {
  const { t } = useLanguage();
  const {
    period,
    setPeriod,
    globalSummary,
    cleanerSummaries,
    isLoading,
    fetchData,
    fetchCleanerDetails,
    getExportData,
    enableCashKept,
  } = useWorkEarnings();

  const [selectedCleaner, setSelectedCleaner] = useState<CleanerWorkSummary | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(period.startDate),
    to: new Date(period.endDate),
  });

  const handleCleanerClick = (cleaner: CleanerWorkSummary) => {
    setSelectedCleaner(cleaner);
    setDetailModalOpen(true);
  };

  const handleDateRangeSelect = (range: Date | DateRange | undefined) => {
    if (range && 'from' in range && range.from && range.to) {
      setDateRange(range);
      setPeriod({
        startDate: format(range.from, 'yyyy-MM-dd'),
        endDate: format(range.to, 'yyyy-MM-dd'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Inline KPIs + Action Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left side: Mini KPIs inline */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground">Jobs</span>
            <span className="font-semibold text-sm">{globalSummary.totalJobsCompleted}</span>
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] text-muted-foreground">Hours</span>
            <span className="font-semibold text-sm">{globalSummary.totalHoursWorked.toFixed(1)}h</span>
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground">Revenue</span>
            <span className="font-semibold text-sm">${globalSummary.totalGrossServiceRevenue.toLocaleString()}</span>
          </div>
          
          {/* Cash KPIs - only when enableCashKept = true */}
          {enableCashKept && (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md">
                <Banknote className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] text-muted-foreground">Collected</span>
                <span className="font-semibold text-sm">${globalSummary.totalCashCollected.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md">
                <DollarSign className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-[10px] text-muted-foreground">Kept</span>
                <span className="font-semibold text-sm">${globalSummary.cashKeptApproved.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">To Office</span>
                <span className="font-semibold text-sm">${globalSummary.cashDeliveredToOffice.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
        
        {/* Right side: Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <DatePickerDialog
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            dateFormat="MMM d, yyyy"
            className="text-xs h-8 w-auto"
          />

          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <ExportReportButton
            period={period}
            globalSummary={globalSummary}
            getExportData={getExportData}
            enableCashKept={enableCashKept}
          />
        </div>
      </div>

      {/* Staff Work Summary Table */}
      <Card className="border-border/50">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">Staff Work Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cleanerSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Briefcase className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No completed jobs found for this period</p>
              <p className="text-xs">Try selecting a different date range</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase tracking-wide hover:bg-transparent">
                  <TableHead className="w-[200px]">Employee</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="text-right w-[80px]">Jobs</TableHead>
                  <TableHead className="text-right w-[100px]">Hours</TableHead>
                  <TableHead className="text-right w-[120px]">Service Value</TableHead>
                  {enableCashKept && <TableHead className="text-right w-[120px]">Cash Kept (Approved)</TableHead>}
                  {enableCashKept && <TableHead className="text-right w-[120px]">Cash Delivered</TableHead>}
                  <TableHead className="w-[80px]">Flags</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cleanerSummaries.map((cleaner) => (
                  <TableRow 
                    key={cleaner.id} 
                    className="text-[12px] cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCleanerClick(cleaner)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                            {cleaner.cleanerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{cleaner.cleanerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] capitalize">
                        {cleaner.role || 'staff'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cleaner.jobsCompleted}
                    </TableCell>
                    <TableCell className="text-right">
                      {cleaner.totalHoursWorked.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${cleaner.totalServiceValue.toLocaleString()}
                    </TableCell>
                    {enableCashKept && (
                      <TableCell className="text-right">
                        {cleaner.cashKeptApproved > 0 ? (
                          <span className="text-amber-600 font-medium">
                            ${cleaner.cashKeptApproved.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {enableCashKept && (
                      <TableCell className="text-right">
                        {cleaner.cashDeliveredToOffice > 0 ? (
                          <span className="text-green-600 font-medium">
                            ${cleaner.cashDeliveredToOffice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {cleaner.hasDisputes && (
                        <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                          Dispute
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cash Reconciliation Note - Only show when cash kept is enabled */}
      {enableCashKept && (globalSummary.cashKeptApproved > 0) && (
        <Alert className="border-amber-200 bg-amber-50/50">
          <Banknote className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm font-medium text-amber-800">Cash Pending External Compensation</AlertTitle>
          <AlertDescription className="text-xs text-amber-700">
            ${globalSummary.cashKeptApproved.toLocaleString()} in approved cash was kept by staff and should be 
            accounted for in external payroll processing. This amount is ready for settlement.
          </AlertDescription>
        </Alert>
      )}

      {/* Employee Detail Modal */}
      {selectedCleaner && (
        <CleanerDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          cleanerName={selectedCleaner.cleanerName}
          cleanerId={selectedCleaner.cleanerId}
          onFetchDetails={fetchCleanerDetails}
        />
      )}
    </div>
  );
};

export default WorkEarningsSummary;
