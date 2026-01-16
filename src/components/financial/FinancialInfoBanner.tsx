import { cn } from "@/lib/utils";
import { Info, AlertTriangle, BookOpen } from "lucide-react";

interface FinancialInfoBannerProps {
  variant: 'payments' | 'ledger' | 'work';
}

const bannerContent = {
  payments: {
    icon: AlertTriangle,
    text: "Operational finance workflow. Approve/dispute cash handling, review invoices/receipts. Items may be pending here before accounting consolidation.",
    className: "bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-200",
  },
  ledger: {
    icon: BookOpen,
    text: "Accounting Ledger (consolidated). Shows only paid/approved records for reporting/export.",
    className: "bg-primary/5 border-primary/20 text-primary dark:bg-primary/10",
  },
  work: {
    icon: Info,
    text: "Operational & time summaries for payroll preparation and accounting support. No salaries/taxes calculated.",
    className: "bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-200",
  },
};

export function FinancialInfoBanner({ variant }: FinancialInfoBannerProps) {
  const content = bannerContent[variant];
  const Icon = content.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-md border text-xs",
      content.className
    )}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{content.text}</span>
    </div>
  );
}
