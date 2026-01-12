import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import { supabase } from '@/lib/supabase';
import { useCompanyPreferences } from '@/hooks/useCompanyPreferences';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Camera, Upload, CheckCircle, Clock, MapPin, User, DollarSign, CreditCard, Banknote, CalendarIcon, AlertTriangle, Loader2, X, Package, Plus, Image } from 'lucide-react';
import { ScheduledJob } from '@/stores/scheduleStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { formatSafeDate, toSafeLocalDate } from '@/lib/dates';

interface CompanyChecklistItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface JobCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ScheduledJob | null;
  onComplete: (jobId: string, afterPhotos?: string[], notes?: string, paymentData?: PaymentData) => void;
}

// Standardized payment methods matching DB enum
export type PaymentMethodType = 'cash' | 'e_transfer' | 'cheque' | 'credit_card' | 'bank_transfer';

export interface PaymentData {
  paymentMethod: PaymentMethodType | null;
  paymentAmount: number;
  paymentDate: Date;
  paymentReference?: string;
  paymentReceivedBy?: 'cleaner' | 'company';
  paymentNotes?: string;
  cashHandlingChoice?: 'keep_cash' | 'hand_to_admin';
}

// Payment method configuration for UI
const PAYMENT_METHODS: { value: PaymentMethodType; label: string; icon: 'cash' | 'card' | 'bank' }[] = [
  { value: 'cash', label: 'Cash', icon: 'cash' },
  { value: 'e_transfer', label: 'E-Transfer', icon: 'card' },
  { value: 'cheque', label: 'Cheque', icon: 'bank' },
  { value: 'credit_card', label: 'Credit Card', icon: 'card' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'bank' },
];

interface ChecklistItemState {
  item: string;
  completed: boolean;
}

const MAX_PHOTOS = 10;

const JobCompletionModal = ({ open, onOpenChange, job, onComplete }: JobCompletionModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompanyStore();
  const { preferences } = useCompanyPreferences();
  const enableCashKept = preferences.enableCashKeptByEmployee;

  const afterPhotoRef = useRef<HTMLInputElement>(null);

  // Prevent double submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company checklist items from database
  const [companyChecklistItems, setCompanyChecklistItems] = useState<CompanyChecklistItem[]>([]);
  const [loadingChecklistItems, setLoadingChecklistItems] = useState(false);

  // Selected items (tools/supplies used by cleaner)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  // Multiple photos support
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  // Payment fields - REQUIRED for job completion
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | ''>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentReceivedBy, setPaymentReceivedBy] = useState<'cleaner' | 'company' | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [cashHandlingChoice, setCashHandlingChoice] = useState<'keep_cash' | 'hand_to_admin' | ''>('');

  // Fetch checklist items from company settings
  const fetchChecklistItems = async () => {
    if (!activeCompanyId) return;

    setLoadingChecklistItems(true);
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('id, name, description, is_active, display_order')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCompanyChecklistItems(data || []);
    } catch (err) {
      console.error('Error fetching checklist items:', err);
    } finally {
      setLoadingChecklistItems(false);
    }
  };

  // Reset state when modal opens with a new job
  useEffect(() => {
    if (open && job) {
      fetchChecklistItems();

      // If job already has checklist data, restore selected items
      if (job.checklist && Array.isArray(job.checklist)) {
        const previouslySelected = job.checklist
          .filter((item: any) => item.completed)
          .map((item: any) => item.item);
        setSelectedItems(previouslySelected);
      } else {
        setSelectedItems([]);
      }

      setNotes('');
      
      // Load existing before photos from job (read-only display)
      setBeforePhotos(job.beforePhotos || []);
      // Load existing after photos or start fresh
      setAfterPhotos(job.afterPhotos || []);
      
      // Reset payment fields - default to service date
      setPaymentMethod('');
      setPaymentAmount('');
      setPaymentDate(toSafeLocalDate(job.date));
      setPaymentReference('');
      setCashHandlingChoice('');
      setPaymentReceivedBy('');
      setPaymentNotes('');
    }
  }, [open, job, activeCompanyId]);

  // Force payment date to service date when Cash is selected
  useEffect(() => {
    if (paymentMethod === 'cash' && job?.date) {
      setPaymentDate(toSafeLocalDate(job.date));
    }
  }, [paymentMethod, job?.date]);

  const toggleChecklistItem = (itemName: string) => {
    setSelectedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const selectedCount = selectedItems.length;
  const totalItems = companyChecklistItems.length;

  const handleAfterPhotoUpload = async (file: File) => {
    if (!job || !activeCompanyId) return;

    if (afterPhotos.length >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    setUploadingAfter(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeCompanyId}/${job.id}/after-${Date.now()}-${afterPhotos.length}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(data.path);

      setAfterPhotos(prev => [...prev, urlData.publicUrl]);
      toast.success('After photo uploaded');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingAfter(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        handleAfterPhotoUpload(file);
      });
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (!job || isSubmitting) return;

    // Payment is REQUIRED - validate before proceeding
    if (!isPaymentValid()) {
      return;
    }

    // Prevent double submission
    setIsSubmitting(true);

    // Close modal IMMEDIATELY to prevent reopening
    onOpenChange(false);

    // Save checklist with selected items
    const checklistToSave = companyChecklistItems.map(item => ({
      item: item.name,
      completed: selectedItems.includes(item.name)
    }));

    // Update job with checklist in database
    if (activeCompanyId) {
      try {
        await supabase
          .from('jobs')
          .update({ checklist: checklistToSave })
          .eq('id', job.id)
          .eq('company_id', activeCompanyId);
      } catch (err) {
        console.error('Error saving checklist:', err);
      }
    }

    const paymentData: PaymentData = {
      paymentMethod: paymentMethod as PaymentMethodType,
      paymentAmount: parseFloat(paymentAmount) || 0,
      // Force service date for cash payments (backend validation)
      paymentDate: paymentMethod === 'cash' ? toSafeLocalDate(job.date) : paymentDate,
      paymentReference: paymentMethod !== 'cash' ? paymentReference : undefined,
      // When cash kept is disabled, always set to 'company'
      paymentReceivedBy: paymentMethod === 'cash' 
        ? (enableCashKept ? paymentReceivedBy as 'cleaner' | 'company' : 'company')
        : undefined,
      paymentNotes,
      // Only include cashHandlingChoice when cash kept is enabled AND cleaner received cash
      cashHandlingChoice: paymentMethod === 'cash' && enableCashKept && paymentReceivedBy === 'cleaner'
        ? cashHandlingChoice as 'keep_cash' | 'hand_to_admin'
        : undefined,
    };

    // Call onComplete with array of after photos
    onComplete(job.id, afterPhotos.length > 0 ? afterPhotos : undefined, notes, paymentData);

    // Reset submitting state after a delay to ensure cleanup
    setTimeout(() => setIsSubmitting(false), 500);
  };

  // Payment is REQUIRED - check if payment form is valid
  const isPaymentValid = () => {
    if (!paymentMethod) return false;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return false;
    
    // When cash kept is disabled, no extra validation needed for cash
    if (paymentMethod === 'cash' && enableCashKept) {
      if (!paymentReceivedBy) return false;
      // If cleaner received cash, they must choose what to do with it
      if (paymentReceivedBy === 'cleaner' && !cashHandlingChoice) return false;
    }
    return true;
  };

  const canAddMoreAfterPhotos = afterPhotos.length < MAX_PHOTOS;

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {t.job.completeJob}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* Job Info */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{job.clientName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.address}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                    <Clock className="h-3.5 w-3.5" />
                    {job.time} ({job.duration})
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end mt-1">
                    <User className="h-3.5 w-3.5" />
                    {job.employeeName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Before Photos (Read-only display) */}
          {beforePhotos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Image className="h-4 w-4" />
                {t.job.before || 'Before Photos'} ({beforePhotos.length})
              </h4>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {beforePhotos.map((photo, index) => (
                  <div
                    key={`before-${index}`}
                    className="shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={photo}
                      alt={`Before ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* After Photos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                {t.job.after || 'After Photos'}
              </h4>
              <span className="text-xs text-muted-foreground">
                ({afterPhotos.length}/{MAX_PHOTOS})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload photos showing the completed work for each room or area.
            </p>
            
            <input
              ref={afterPhotoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Photo Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {/* Existing After Photos */}
              {afterPhotos.map((photo, index) => (
                <div
                  key={`after-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
                >
                  <img
                    src={photo}
                    alt={`After ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAfterPhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add Photo Button */}
              {canAddMoreAfterPhotos && (
                <div
                  className={cn(
                    "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
                    "border-border hover:border-primary hover:bg-muted/50",
                    uploadingAfter && "pointer-events-none opacity-70"
                  )}
                  onClick={() => !uploadingAfter && afterPhotoRef.current?.click()}
                >
                  {uploadingAfter ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tools/Supplies Used (Checklist from Company Settings) - OPTIONAL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                {t.job.toolsUsed || 'Tools & Supplies Used'}
                <span className="text-xs font-normal text-muted-foreground">({t.common.optional || 'Optional'})</span>
              </h4>
              {selectedCount > 0 && (
                <span className="text-sm text-muted-foreground">{selectedCount} {t.common.added || 'added'}</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {t.job.addToolsUsed || 'Add any tools or supplies you used for this cleaning service.'}
            </p>

            {loadingChecklistItems ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : companyChecklistItems.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                  {companyChecklistItems.map((item) => {
                    const isSelected = selectedItems.includes(item.name);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center space-x-3 p-2.5 rounded-lg border transition-colors cursor-pointer",
                          isSelected ? "bg-success/10 border-success/30" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                        )}
                        onClick={() => toggleChecklistItem(item.name)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChecklistItem(item.name)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-sm block", isSelected && "text-success font-medium")}>
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                {t.job.noChecklistItems || 'No tools/supplies configured. Admin can add items in Company Settings.'}
              </div>
            )}
          </div>

          {/* Payment Section - REQUIRED */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">Payment Information (Required)</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Payment must be recorded to complete this job.
            </p>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 space-y-4">
                {/* Payment Method - 5 standardized options */}
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <Button
                        key={method.value}
                        type="button"
                        variant={paymentMethod === method.value ? 'default' : 'outline'}
                        className={cn(
                          "h-10 justify-start gap-2 text-sm",
                          paymentMethod === method.value && "ring-2 ring-primary"
                        )}
                        onClick={() => setPaymentMethod(method.value)}
                      >
                        {method.icon === 'cash' && <Banknote className="h-4 w-4" />}
                        {method.icon === 'card' && <CreditCard className="h-4 w-4" />}
                        {method.icon === 'bank' && <CreditCard className="h-4 w-4" />}
                        {method.label}
                      </Button>
                    ))}
                  </div>
                  {!paymentMethod && (
                    <p className="text-xs text-destructive">Please select a payment method</p>
                  )}
                </div>

                {/* Amount and Date */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="pl-7"
                        placeholder="0.00"
                      />
                    </div>
                    {(!paymentAmount || parseFloat(paymentAmount) <= 0) && (
                      <p className="text-xs text-destructive">Please enter a valid amount</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    {paymentMethod === 'cash' ? (
                      // Cash: Show readonly date with explanation
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 h-10">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatSafeDate(paymentDate, "PPP")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cash payments must be recorded on the service date
                        </p>
                      </div>
                    ) : (
                      // E-Transfer: Allow date selection
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !paymentDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {paymentDate ? formatSafeDate(paymentDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={paymentDate}
                            onSelect={(date) => date && setPaymentDate(date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Transaction Reference - Show for non-cash payments */}
                {paymentMethod && paymentMethod !== 'cash' && (
                  <div className="space-y-2">
                    <Label>Transaction Reference / ID</Label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Enter transaction reference number"
                    />
                  </div>
                )}

                {/* Cash Received By - Only show options when enableCashKept is true */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-4">
                    {enableCashKept ? (
                      <>
                        <div className="space-y-2">
                          <Label>Who Received the Cash? *</Label>
                          <Select value={paymentReceivedBy} onValueChange={(v) => {
                            setPaymentReceivedBy(v as 'cleaner' | 'company');
                            if (v === 'company') setCashHandlingChoice('');
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select who received payment" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cleaner">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Cleaner
                                </div>
                              </SelectItem>
                              <SelectItem value="company">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Company / Office
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {!paymentReceivedBy && (
                            <p className="text-xs text-destructive">Please select who received the payment</p>
                          )}
                        </div>

                        {/* Cash Handling Choice - Only when cleaner received cash */}
                        {paymentReceivedBy === 'cleaner' && (
                          <div className="space-y-3 p-4 rounded-lg border border-warning/30 bg-warning/5">
                            <div className="flex items-center gap-2 text-warning">
                              <AlertTriangle className="h-4 w-4" />
                              <Label className="text-warning font-medium">What will you do with this cash? *</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This choice requires admin approval before affecting your payroll.
                            </p>
                            <div className="grid gap-3">
                              <Button
                                type="button"
                                variant={cashHandlingChoice === 'keep_cash' ? 'default' : 'outline'}
                                className={cn(
                                  "h-auto py-3 px-4 justify-start text-left",
                                  cashHandlingChoice === 'keep_cash' && "ring-2 ring-warning bg-warning text-warning-foreground"
                                )}
                                onClick={() => setCashHandlingChoice('keep_cash')}
                              >
                                <div className="flex items-start gap-3">
                                  <Banknote className="h-5 w-5 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="font-medium">Keep the Cash</p>
                                    <p className="text-xs opacity-80 font-normal">
                                      Amount will be deducted from your next payroll (requires admin approval)
                                    </p>
                                  </div>
                                </div>
                              </Button>
                              <Button
                                type="button"
                                variant={cashHandlingChoice === 'hand_to_admin' ? 'default' : 'outline'}
                                className={cn(
                                  "h-auto py-3 px-4 justify-start text-left",
                                  cashHandlingChoice === 'hand_to_admin' && "ring-2 ring-primary"
                                )}
                                onClick={() => setCashHandlingChoice('hand_to_admin')}
                              >
                                <div className="flex items-start gap-3">
                                  <User className="h-5 w-5 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="font-medium">Hand Over to Admin</p>
                                    <p className="text-xs opacity-80 font-normal">
                                      You will deliver the cash to the office/admin
                                    </p>
                                  </div>
                                </div>
                              </Button>
                            </div>
                            {!cashHandlingChoice && (
                              <p className="text-xs text-destructive">Please select how you will handle this cash</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      // When cash kept is disabled, show info message
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground">
                          Cash payments are automatically recorded as delivered to office.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Notes */}
                <div className="space-y-2">
                  <Label>Payment Notes</Label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Any additional notes about this payment..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t.job.notes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.job.serviceNotesPlaceholder}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleComplete} className="gap-2" disabled={!isPaymentValid()}>
              <CheckCircle className="h-4 w-4" />
              {t.schedule.markCompleted}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobCompletionModal;
