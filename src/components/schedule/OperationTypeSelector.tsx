import { cn } from "@/lib/utils";
import { DollarSign, ClipboardCheck, Wrench } from "lucide-react";

export type OperationType = 'billable_service' | 'non_billable_visit' | 'internal_work';

interface OperationTypeSelectorProps {
  value: OperationType;
  onChange: (value: OperationType) => void;
  disabled?: boolean;
}

const operationTypes: {
  value: OperationType;
  label: string;
  description: string;
  icon: typeof DollarSign;
}[] = [
  {
    value: 'billable_service',
    label: 'Billable Service',
    description: 'Creates financial records (receipt/invoice) based on payment rules.',
    icon: DollarSign,
  },
  {
    value: 'non_billable_visit',
    label: 'Non-Billable Visit',
    description: 'Operational record only. No invoice/receipt.',
    icon: ClipboardCheck,
  },
  {
    value: 'internal_work',
    label: 'Internal Work',
    description: 'Internal tracking only. No client billing.',
    icon: Wrench,
  },
];

export function OperationTypeSelector({ value, onChange, disabled }: OperationTypeSelectorProps) {
  const selectedType = operationTypes.find(t => t.value === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Operation Type</label>
      <div className="grid grid-cols-3 gap-2">
        {operationTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(type.value)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all text-center",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-border bg-background text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium leading-tight">{type.label}</span>
            </button>
          );
        })}
      </div>
      {selectedType && (
        <p className="text-xs text-muted-foreground italic">
          {selectedType.description}
        </p>
      )}
    </div>
  );
}
