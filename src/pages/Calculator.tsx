import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { 
  Calculator as CalcIcon, 
  Plus,
  Edit,
  Trash2,
  FileText,
  Send,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEstimateStore, Estimate } from '@/stores/estimateStore';
import { logActivity } from '@/stores/activityStore';
import AddEstimateModal from '@/components/modals/AddEstimateModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { useCompanyStore } from '@/stores/companyStore';
import { generateEstimatePdf, openPdfPreview } from '@/utils/pdfGenerator';
import { format, addDays } from 'date-fns';

const Calculator = () => {
  const { t } = useLanguage();
  const { estimates, addEstimate, updateEstimate, deleteEstimate } = useEstimateStore();
  const { profile, branding } = useCompanyStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);

  const statusConfig: Record<string, { label: string; variant: 'active' | 'pending' | 'completed' | 'inactive' }> = {
    draft: { label: 'Draft', variant: 'pending' },
    sent: { label: 'Sent', variant: 'active' },
    accepted: { label: 'Accepted', variant: 'completed' },
    rejected: { label: 'Rejected', variant: 'inactive' },
  };

  const serviceTypeLabels: Record<string, string> = {
    standard: 'Standard Clean',
    deep: 'Deep Clean',
    moveOut: 'Move-out Clean',
    commercial: 'Commercial Clean',
  };

  const frequencyLabels: Record<string, string> = {
    oneTime: 'One-time',
    monthly: 'Monthly',
    biweekly: 'Bi-weekly',
    weekly: 'Weekly',
  };

  const handleAddEstimate = (estimate: Omit<Estimate, 'id' | 'createdAt'>) => {
    addEstimate(estimate);
    logActivity('estimate_created', `Estimate created for ${estimate.clientName}`, undefined, estimate.clientName);
    toast.success(t.calculator.estimateCreated);
  };

  const handleUpdateEstimate = (estimate: Omit<Estimate, 'id' | 'createdAt'>) => {
    if (editingEstimate) {
      updateEstimate(editingEstimate.id, estimate);
      logActivity('estimate_updated', `Estimate updated for ${estimate.clientName}`, editingEstimate.id, estimate.clientName);
      toast.success(t.calculator.estimateUpdated);
      setEditingEstimate(null);
    }
  };

  const handleDeleteEstimate = () => {
    if (estimateToDelete) {
      deleteEstimate(estimateToDelete.id);
      logActivity('estimate_deleted', `Estimate deleted for ${estimateToDelete.clientName}`, estimateToDelete.id, estimateToDelete.clientName);
      toast.success(t.calculator.estimateDeleted);
      setEstimateToDelete(null);
    }
  };

  const handleViewPdf = (estimate: Estimate) => {
    const extras: string[] = [];
    if (estimate.includePets) extras.push('Pets Fee');
    if (estimate.includeChildren) extras.push('Children Fee');
    if (estimate.includeGreen) extras.push('Green Cleaning');
    if (estimate.includeFridge) extras.push('Clean Fridge');
    if (estimate.includeOven) extras.push('Clean Oven');
    if (estimate.includeCabinets) extras.push('Clean Cabinets');
    if (estimate.includeWindows) extras.push('Clean Windows');

    const pdfHtml = generateEstimatePdf({
      estimateId: estimate.id.slice(0, 8).toUpperCase(),
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      clientPhone: estimate.clientPhone,
      serviceType: serviceTypeLabels[estimate.serviceType],
      frequency: frequencyLabels[estimate.frequency],
      squareFootage: estimate.squareFootage,
      roomDetails: `${estimate.bedrooms} bed, ${estimate.bathrooms} bath`,
      extras,
      totalAmount: estimate.totalAmount,
      validUntil: format(addDays(new Date(estimate.createdAt), 30), 'PPP'),
    }, profile, branding);

    openPdfPreview(pdfHtml, `Estimate-${estimate.clientName}`);
  };

  const handleSendEstimate = (estimate: Estimate) => {
    updateEstimate(estimate.id, { status: 'sent' });
    logActivity('estimate_sent', `Estimate sent to ${estimate.clientName}`, estimate.id, estimate.clientName);
    toast.success(`Estimate sent to ${estimate.clientName}`);
  };

  const columns: Column<Estimate>[] = [
    {
      key: 'clientName',
      header: t.calculator.clientName,
      render: (estimate) => (
        <div>
          <p className="font-medium">{estimate.clientName}</p>
          {estimate.clientEmail && (
            <p className="text-xs text-muted-foreground">{estimate.clientEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'serviceType',
      header: t.calculator.serviceType,
      render: (estimate) => (
        <Badge variant="secondary">
          {serviceTypeLabels[estimate.serviceType]}
        </Badge>
      ),
    },
    {
      key: 'frequency',
      header: t.calculator.frequency,
      render: (estimate) => frequencyLabels[estimate.frequency],
    },
    {
      key: 'squareFootage',
      header: 'Size',
      render: (estimate) => `${estimate.squareFootage.toLocaleString()} sq ft`,
    },
    {
      key: 'totalAmount',
      header: t.calculator.totalEstimate,
      render: (estimate) => (
        <span className="font-semibold text-primary">${estimate.totalAmount}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (estimate) => (
        <StatusBadge
          status={statusConfig[estimate.status].variant}
          label={statusConfig[estimate.status].label}
        />
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      render: (estimate) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewPdf(estimate); }}>
            <FileText className="h-4 w-4" />
          </Button>
          {estimate.status === 'draft' && (
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSendEstimate(estimate); }}>
              <Send className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingEstimate(estimate); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEstimateToDelete(estimate); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Summary stats
  const totalEstimates = estimates.length;
  const pendingEstimates = estimates.filter(e => e.status === 'sent').length;
  const acceptedValue = estimates.filter(e => e.status === 'accepted').reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Consolidated Header: KPIs inline + Add Button */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 min-w-0">
            <CalcIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="font-semibold">{totalEstimates}</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 min-w-0">
            <Send className="h-4 w-4 text-warning shrink-0" />
            <span className="text-xs text-muted-foreground">Pending:</span>
            <span className="font-semibold">{pendingEstimates}</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20 min-w-0">
            <DollarSign className="h-4 w-4 text-success shrink-0" />
            <span className="text-xs text-muted-foreground">Accepted:</span>
            <span className="font-semibold">${acceptedValue.toLocaleString()}</span>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {t.calculator.addEstimate}
        </Button>
      </div>

      {/* Estimates Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalcIcon className="h-4 w-4 text-primary" />
            All Estimates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={estimates}
            emptyMessage={t.common.noData}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <AddEstimateModal
        open={showAddModal || !!editingEstimate}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingEstimate(null);
          }
        }}
        onSave={editingEstimate ? handleUpdateEstimate : handleAddEstimate}
        estimate={editingEstimate || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!estimateToDelete}
        onOpenChange={() => setEstimateToDelete(null)}
        onConfirm={handleDeleteEstimate}
        title={t.common.confirmDelete}
        description={`Are you sure you want to delete the estimate for ${estimateToDelete?.clientName}? This action cannot be undone.`}
      />
    </div>
  );
};

export default Calculator;
