import { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LedgerColumnConfig } from '@/hooks/useLedgerColumnOrder';

interface LedgerColumnSettingsProps {
  columnConfig: LedgerColumnConfig[];
  onSave: (newConfig: LedgerColumnConfig[]) => void;
  onReset: () => void;
}

export function LedgerColumnSettings({
  columnConfig,
  onSave,
  onReset,
}: LedgerColumnSettingsProps) {
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<LedgerColumnConfig[]>(columnConfig);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setLocalConfig(columnConfig);
    }
  }, [open, columnConfig]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newConfig = [...localConfig];
    const [removed] = newConfig.splice(draggedIndex, 1);
    newConfig.splice(index, 0, removed);
    setLocalConfig(newConfig);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleVisibility = (key: string) => {
    setLocalConfig(prev =>
      prev.map(col =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = () => {
    onSave(localConfig);
    setOpen(false);
  };

  const handleReset = () => {
    onReset();
    setOpen(false);
  };

  const visibleCount = localConfig.filter(c => c.visible).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Column Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Customize Columns
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-3">
          Drag to reorder • Toggle visibility • {visibleCount} of {localConfig.length} visible
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {localConfig.map((col, index) => (
            <div
              key={col.key}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg border bg-card transition-all',
                'cursor-grab active:cursor-grabbing',
                draggedIndex === index && 'opacity-50 border-primary',
                !col.visible && 'opacity-60 bg-muted/30'
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              
              <div className="flex-1 text-sm font-medium">
                {col.label}
              </div>

              <div className="flex items-center gap-2">
                {col.visible ? (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Switch
                  checked={col.visible}
                  onCheckedChange={() => toggleVisibility(col.key)}
                  className="scale-75"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LedgerColumnSettings;
