import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useServiceCatalog, ServiceCatalogItem } from "@/hooks/useServiceCatalog";
import { Loader2, Plus } from "lucide-react";

interface ServiceTypeSelectorProps {
  value: string;
  onChange: (serviceId: string | null, serviceName: string, service?: ServiceCatalogItem) => void;
  companyId: string;
  activityCode: string;
  disabled?: boolean;
}

export function ServiceTypeSelector({ 
  value, 
  onChange, 
  companyId,
  activityCode,
  disabled 
}: ServiceTypeSelectorProps) {
  const { services, isLoading } = useServiceCatalog(companyId, activityCode);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === '__custom__') {
      setShowCustomInput(true);
      return;
    }

    const service = services.find(s => s.id === selectedValue);
    if (service) {
      onChange(service.id, service.service_name, service);
    }
  };

  const handleCustomSubmit = () => {
    if (customServiceName.trim()) {
      onChange(null, customServiceName.trim());
      setShowCustomInput(false);
    }
  };

  if (showCustomInput) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service Type (Custom)</label>
        <div className="flex gap-2">
          <Input
            value={customServiceName}
            onChange={(e) => setCustomServiceName(e.target.value)}
            placeholder="Enter service name..."
            disabled={disabled}
            autoFocus
          />
          <Button 
            type="button" 
            size="sm" 
            onClick={handleCustomSubmit}
            disabled={!customServiceName.trim()}
          >
            OK
          </Button>
          <Button 
            type="button" 
            size="sm" 
            variant="ghost"
            onClick={() => {
              setShowCustomInput(false);
              setCustomServiceName('');
            }}
          >
            Cancel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: Ask your admin to add this service to the catalog for faster selection next time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Service Type</label>
      <Select 
        value={value} 
        onValueChange={handleSelectChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select service type..." />
          )}
        </SelectTrigger>
        <SelectContent>
          {services.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              <div className="flex flex-col">
                <span>{service.service_name}</span>
                {service.default_rate && (
                  <span className="text-xs text-muted-foreground">
                    ${service.default_rate.toFixed(2)} • {service.default_duration_minutes} min
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          <SelectItem value="__custom__" className="text-primary">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Custom Service...</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
