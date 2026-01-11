import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterableColumnHeaderProps {
  title: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  allLabel?: string;
  className?: string;
}

export function FilterableColumnHeader({
  title,
  value,
  options,
  onChange,
  allLabel = 'All',
  className,
}: FilterableColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const isFiltered = value !== 'all';
  
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = isFiltered ? selectedOption?.label : title;

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('all');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
            "hover:text-foreground focus:outline-none",
            isFiltered 
              ? "text-primary bg-primary/10 px-1.5 py-0.5 rounded -mx-1.5" 
              : "text-muted-foreground",
            className
          )}
        >
          <span className="truncate max-w-[80px]">{displayLabel}</span>
          {isFiltered ? (
            <X 
              className="h-3 w-3 text-primary hover:text-primary/80 shrink-0" 
              onClick={handleClear}
            />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-0 bg-popover border border-border shadow-lg" 
        align="start"
        sideOffset={8}
      >
        <ScrollArea className="max-h-[280px]">
          <div className="p-1">
            {/* All option */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-xs font-normal h-8",
                value === 'all' && "bg-accent text-accent-foreground"
              )}
              onClick={() => handleSelect('all')}
            >
              {allLabel}
            </Button>
            
            {/* Separator */}
            <div className="h-px bg-border my-1" />
            
            {/* Options */}
            {options
              .filter((opt) => opt.value !== 'all')
              .map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-xs font-normal h-8",
                    value === option.value && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </Button>
              ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default FilterableColumnHeader;
