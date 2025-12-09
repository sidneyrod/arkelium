import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PayrollNotificationProps {
  periodEnded: boolean;
  daysOverdue: number;
  periodName: string;
  status: string;
  onGenerateClick: () => void;
  onApproveClick: () => void;
  isGenerating?: boolean;
}

export function PayrollNotification({
  periodEnded,
  daysOverdue,
  periodName,
  status,
  onGenerateClick,
  onApproveClick,
  isGenerating,
}: PayrollNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  // Period ended but not yet approved
  if (periodEnded && status === 'pending') {
    return (
      <Alert className={cn(
        "border-warning/50 bg-warning/10",
        daysOverdue > 3 && "border-destructive/50 bg-destructive/10"
      )}>
        <AlertTriangle className={cn(
          "h-5 w-5",
          daysOverdue > 3 ? "text-destructive" : "text-warning"
        )} />
        <AlertTitle className="flex items-center gap-2">
          Payroll Period Ready for Review
          {daysOverdue > 0 && (
            <Badge variant="outline" className={cn(
              daysOverdue > 3 ? "border-destructive text-destructive" : "border-warning text-warning"
            )}>
              {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between">
          <span>
            The period <strong>{periodName}</strong> has ended and is ready for approval.
            Review employee hours and approve to proceed with payment.
          </span>
          <Button 
            size="sm" 
            onClick={onApproveClick}
            className="ml-4"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Review & Approve
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // No active period - needs generation
  if (status === 'not_created' || !periodName) {
    return (
      <Alert className="border-info/50 bg-info/10">
        <Clock className="h-5 w-5 text-info" />
        <AlertTitle>No Active Payroll Period</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between">
          <span>
            There's no active payroll period. Generate a new period to start tracking employee hours and wages.
          </span>
          <Button 
            size="sm" 
            onClick={onGenerateClick}
            disabled={isGenerating}
            className="ml-4"
          >
            <Play className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Period'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
