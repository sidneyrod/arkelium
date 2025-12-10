import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  FileText,
  Pencil,
  Briefcase,
  FileSpreadsheet,
  FileCheck,
  X,
  Building2,
  Route,
  StickyNote,
  CalendarClock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Visit } from '@/pages/VisitHistory';

interface VisitDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: Visit;
  onEdit: () => void;
  onConvert: (type: 'job' | 'estimate' | 'contract') => void;
  onCancel: () => void;
  onGeneratePdf: () => void;
  isAdmin: boolean;
  isAdminOrManager: boolean;
}

const statusConfig = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
  'no-show': { color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', label: 'No Show' },
};

const VisitDetailModal = ({
  open,
  onOpenChange,
  visit,
  onEdit,
  onConvert,
  onCancel,
  onGeneratePdf,
  isAdmin,
  isAdminOrManager
}: VisitDetailModalProps) => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return format(date, 'EEEE, MMMM dd, yyyy');
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Visit Details</DialogTitle>
            <Badge 
              variant="outline"
              className={cn(
                "capitalize ml-4",
                statusConfig[visit.status]?.bgColor,
                statusConfig[visit.status]?.color
              )}
            >
              {statusConfig[visit.status]?.label || visit.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{visit.clientName}</p>
                </div>
              </div>
              {visit.clientEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{visit.clientEmail}</p>
                  </div>
                </div>
              )}
              {visit.clientPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{visit.clientPhone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{visit.address}{visit.city && `, ${visit.city}`}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(visit.date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{formatTime(visit.time)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{visit.employeeName}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Visit Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Visit Details</h3>
            <div className="grid grid-cols-1 gap-4">
              {visit.visitPurpose && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{visit.visitPurpose}</p>
                  </div>
                </div>
              )}
              {visit.visitRoute && (
                <div className="flex items-start gap-3">
                  <Route className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Route / Instructions</p>
                    <p className="font-medium whitespace-pre-wrap">{visit.visitRoute}</p>
                  </div>
                </div>
              )}
              {visit.notes && (
                <div className="flex items-start gap-3">
                  <StickyNote className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{visit.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                <span>Created: {formatDateTime(visit.createdAt)}</span>
              </div>
              {visit.completedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span>Completed: {formatDateTime(visit.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {isAdminOrManager && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          {isAdminOrManager && (
            <>
              <Button variant="outline" size="sm" onClick={() => onConvert('job')}>
                <Briefcase className="h-4 w-4 mr-2" />
                Convert to Job
              </Button>
              <Button variant="outline" size="sm" onClick={() => onConvert('estimate')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Convert to Estimate
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => onConvert('contract')}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Convert to Contract
                </Button>
              )}
            </>
          )}
          {visit.status === 'scheduled' && isAdminOrManager && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisitDetailModal;
