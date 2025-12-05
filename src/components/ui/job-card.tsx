import { cn } from '@/lib/utils';
import { MapPin, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

interface JobCardProps {
  client: string;
  address: string;
  time: string;
  employee: string;
  status: JobStatus;
  hasPhotos?: boolean;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  'in-progress': { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const JobCard = ({ client, address, time, employee, status, hasPhotos, className }: JobCardProps) => {
  const config = statusConfig[status];

  return (
    <div className={cn(
      "group rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-soft-lg cursor-pointer",
      className
    )}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-1 min-w-0">
          <h4 className="font-semibold truncate">{client}</h4>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>
        <Badge variant={config.variant} className="flex-shrink-0">
          {config.label}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          <span>{employee}</span>
        </div>
      </div>

      {hasPhotos && (
        <div className="mt-4 flex gap-2">
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
            Before
          </div>
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-xs text-primary">
            After
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCard;
