import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, Building2, User, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CashHandlingChoice = 'kept_by_cleaner' | 'delivered_to_office';

interface CashHandlingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onConfirm: (choice: CashHandlingChoice, notes?: string) => void;
  cleanerName?: string;
}

const CashHandlingModal = ({ 
  open, 
  onOpenChange, 
  amount, 
  onConfirm,
  cleanerName = 'Cleaner'
}: CashHandlingModalProps) => {
  const { language } = useLanguage();
  const [choice, setChoice] = useState<CashHandlingChoice | ''>('');
  const [notes, setNotes] = useState('');

  const labels = {
    en: {
      title: 'Cash Handling Required',
      subtitle: 'Please specify what happened with the cash payment',
      amount: 'Cash Amount Received',
      question: 'Who kept the cash?',
      keptByCleaner: 'I kept the cash',
      keptByCleanerDesc: 'Amount will be deducted from your next payroll',
      deliveredToOffice: 'Cash delivered to office',
      deliveredToOfficeDesc: 'Cash was handed over to admin/office',
      notes: 'Notes (optional)',
      notesPlaceholder: 'Add any relevant notes about this cash payment...',
      confirm: 'Confirm Cash Handling',
      cancel: 'Cancel',
      warning: 'You must select an option before continuing',
    },
    fr: {
      title: 'Gestion de l\'espèce requise',
      subtitle: 'Veuillez spécifier ce qui s\'est passé avec le paiement en espèces',
      amount: 'Montant reçu en espèces',
      question: 'Qui a gardé l\'argent?',
      keptByCleaner: 'J\'ai gardé l\'argent',
      keptByCleanerDesc: 'Le montant sera déduit de votre prochaine paie',
      deliveredToOffice: 'Espèces remises au bureau',
      deliveredToOfficeDesc: 'L\'argent a été remis à l\'admin/bureau',
      notes: 'Notes (optionnel)',
      notesPlaceholder: 'Ajouter des notes pertinentes sur ce paiement...',
      confirm: 'Confirmer la gestion',
      cancel: 'Annuler',
      warning: 'Vous devez sélectionner une option avant de continuer',
    }
  };

  const t = labels[language] || labels.en;

  const handleConfirm = () => {
    if (!choice) return;
    onConfirm(choice, notes || undefined);
    // Reset state
    setChoice('');
    setNotes('');
  };

  const handleClose = () => {
    // Don't allow closing without selection
    if (!choice) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-success" />
            {t.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Display */}
          <Card className="bg-success/10 border-success/30">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="text-sm font-medium">{t.amount}</span>
              <span className="text-xl font-bold text-success">${amount.toFixed(2)} CAD</span>
            </CardContent>
          </Card>

          {/* Cash Handling Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.question}</Label>
            
            <RadioGroup 
              value={choice} 
              onValueChange={(v) => setChoice(v as CashHandlingChoice)}
              className="space-y-3"
            >
              {/* Option: Kept by Cleaner */}
              <div
                className={cn(
                  "flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                  choice === 'kept_by_cleaner' 
                    ? "border-warning bg-warning/10" 
                    : "border-border hover:border-warning/50 hover:bg-muted/50"
                )}
                onClick={() => setChoice('kept_by_cleaner')}
              >
                <RadioGroupItem value="kept_by_cleaner" id="kept_by_cleaner" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-warning" />
                    <Label htmlFor="kept_by_cleaner" className="font-medium cursor-pointer">
                      {t.keptByCleaner}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.keptByCleanerDesc}</p>
                </div>
              </div>

              {/* Option: Delivered to Office */}
              <div
                className={cn(
                  "flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                  choice === 'delivered_to_office' 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => setChoice('delivered_to_office')}
              >
                <RadioGroupItem value="delivered_to_office" id="delivered_to_office" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <Label htmlFor="delivered_to_office" className="font-medium cursor-pointer">
                      {t.deliveredToOffice}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.deliveredToOfficeDesc}</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">{t.notes}</Label>
            <Textarea
              placeholder={t.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          {/* Warning if no selection */}
          {!choice && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-warning">{t.warning}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setChoice('');
              setNotes('');
              onOpenChange(false);
            }}
            disabled={!choice}
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!choice}
            className={cn(
              choice === 'kept_by_cleaner' && "bg-warning hover:bg-warning/90",
              choice === 'delivered_to_office' && "bg-primary hover:bg-primary/90"
            )}
          >
            {t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashHandlingModal;
