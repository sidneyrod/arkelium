import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/stores/companyStore';
import { supabase } from '@/lib/supabase';
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
import { Camera, Upload, CheckCircle, Clock, MapPin, User, DollarSign, CreditCard, Banknote, CalendarIcon, AlertTriangle, Loader2, X } from 'lucide-react';
import { ScheduledJob } from '@/stores/scheduleStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface JobCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ScheduledJob | null;
  onComplete: (jobId: string, afterPhoto?: string, notes?: string, paymentData?: PaymentData) => void;
}

export interface PaymentData {
  paymentMethod: 'e-transfer' | 'cash' | null;
  paymentAmount: number;
  paymentDate: Date;
  paymentReference?: string;
  paymentReceivedBy?: 'cleaner' | 'company';
  paymentNotes?: string;
}

interface ChecklistItemState {
  item: string;
  completed: boolean;
}

const JobCompletionModal = ({ open, onOpenChange, job, onComplete }: JobCompletionModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { scheduleConfig } = useCompanyStore();
  
  const beforePhotoRef = useRef<HTMLInputElement>(null);
  const afterPhotoRef = useRef<HTMLInputElement>(null);
  
  // Build checklist from company config or use job's existing checklist
  const getInitialChecklist = (): ChecklistItemState[] => {
    if (job?.checklist && Array.isArray(job.checklist) && job.checklist.length > 0) {
      return job.checklist;
    }
    // Use active checklist items from company config
    const activeItems = scheduleConfig.checklistItems
      .filter(item => item.isActive)
      .sort((a, b) => a.order - b.order)
      .map(item => ({ item: item.name, completed: false }));
    
    return activeItems.length > 0 ? activeItems : [
      { item: 'Vacuum all floors', completed: false },
      { item: 'Mop hard floors', completed: false },
      { item: 'Dust surfaces', completed: false },
      { item: 'Clean bathrooms', completed: false },
      { item: 'Clean kitchen', completed: false },
      { item: 'Empty trash bins', completed: false },
    ];
  };
  
  const [checklist, setChecklist] = useState<ChecklistItemState[]>(getInitialChecklist());
  const [notes, setNotes] = useState('');
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  
  // Payment fields - REQUIRED for job completion
  const [paymentMethod, setPaymentMethod] = useState<'e-transfer' | 'cash' | ''>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentReceivedBy, setPaymentReceivedBy] = useState<'cleaner' | 'company' | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Reset state when modal opens with a new job
  useEffect(() => {
    if (open && job) {
      setChecklist(getInitialChecklist());
      setNotes('');
      setBeforePhoto(job.beforePhoto || null);
      setAfterPhoto(job.afterPhoto || null);
      // Reset payment fields
      setPaymentMethod('');
      setPaymentAmount('');
      setPaymentDate(new Date());
      setPaymentReference('');
      setPaymentReceivedBy('');
      setPaymentNotes('');
    }
  }, [open, job, scheduleConfig.checklistItems]);

  const toggleChecklistItem = (index: number) => {
    setChecklist(prev => prev.map((item, i) => 
      i === index ? { ...item, completed: !item.completed } : item
    ));
  };

  const completedItems = checklist.filter(item => item.completed).length;
  const progress = checklist.length > 0 ? Math.round((completedItems / checklist.length) * 100) : 0;

  const handlePhotoUpload = async (type: 'before' | 'after', file: File) => {
    if (!job || !user?.profile?.company_id) return;
    
    const setUploading = type === 'before' ? setUploadingBefore : setUploadingAfter;
    const setPhoto = type === 'before' ? setBeforePhoto : setAfterPhoto;
    
    setUploading(true);
    
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
      const fileName = `${user.profile.company_id}/${job.id}/${type}-${Date.now()}.${fileExt}`;
      
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
      
      setPhoto(urlData.publicUrl);
      toast.success(`${type === 'before' ? 'Before' : 'After'} photo uploaded`);
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (type: 'before' | 'after', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(type, file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const removePhoto = (type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforePhoto(null);
    } else {
      setAfterPhoto(null);
    }
  };

  const handleComplete = () => {
    if (!job) return;
    
    // Payment is REQUIRED - validate before proceeding
    if (!isPaymentValid()) {
      return;
    }
    
    const paymentData: PaymentData = {
      paymentMethod: paymentMethod as 'e-transfer' | 'cash',
      paymentAmount: parseFloat(paymentAmount) || 0,
      paymentDate,
      paymentReference: paymentMethod === 'e-transfer' ? paymentReference : undefined,
      paymentReceivedBy: paymentMethod === 'cash' ? paymentReceivedBy as 'cleaner' | 'company' : undefined,
      paymentNotes,
    };
    
    onComplete(job.id, afterPhoto || undefined, notes, paymentData);
    onOpenChange(false);
  };

  // Payment is REQUIRED - check if payment form is valid
  const isPaymentValid = () => {
    if (!paymentMethod) return false;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return false;
    if (paymentMethod === 'cash' && !paymentReceivedBy) return false;
    return true;
  };

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
          
          {/* Photos */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              {t.job.photos}
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Before Photo */}
              <div className="space-y-2">
                <Label>{t.job.before}</Label>
                <input
                  ref={beforePhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect('before', e)}
                />
                <div 
                  className={cn(
                    "h-28 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden",
                    beforePhoto ? "border-success bg-success/5" : "border-border hover:border-primary hover:bg-muted/50",
                    uploadingBefore && "pointer-events-none opacity-70"
                  )}
                  onClick={() => !uploadingBefore && !beforePhoto && beforePhotoRef.current?.click()}
                >
                  {uploadingBefore ? (
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                    </div>
                  ) : beforePhoto ? (
                    <>
                      <img src={beforePhoto} alt="Before" className="h-full w-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto('before');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">{t.job.uploadBeforePhoto}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* After Photo */}
              <div className="space-y-2">
                <Label>{t.job.after}</Label>
                <input
                  ref={afterPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect('after', e)}
                />
                <div 
                  className={cn(
                    "h-28 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden",
                    afterPhoto ? "border-success bg-success/5" : "border-border hover:border-primary hover:bg-muted/50",
                    uploadingAfter && "pointer-events-none opacity-70"
                  )}
                  onClick={() => !uploadingAfter && !afterPhoto && afterPhotoRef.current?.click()}
                >
                  {uploadingAfter ? (
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                    </div>
                  ) : afterPhoto ? (
                    <>
                      <img src={afterPhoto} alt="After" className="h-full w-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto('after');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">{t.job.uploadAfterPhoto}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Checklist */}
          {checklist.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {t.job.checklist}
                </h4>
                <span className="text-sm text-muted-foreground">{completedItems}/{checklist.length} ({progress}%)</span>
              </div>
              
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="grid gap-2 sm:grid-cols-2">
                {checklist.map((item, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-center space-x-3 p-2.5 rounded-lg border transition-colors cursor-pointer",
                      item.completed ? "bg-success/10 border-success/30" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    )}
                    onClick={() => toggleChecklistItem(index)}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(index)}
                    />
                    <span className={cn("text-sm", item.completed && "line-through text-muted-foreground")}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={paymentMethod === 'e-transfer' ? 'default' : 'outline'}
                      className={cn(
                        "h-12 justify-start gap-3",
                        paymentMethod === 'e-transfer' && "ring-2 ring-primary"
                      )}
                      onClick={() => setPaymentMethod('e-transfer')}
                    >
                      <CreditCard className="h-5 w-5" />
                      E-Transfer
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      className={cn(
                        "h-12 justify-start gap-3",
                        paymentMethod === 'cash' && "ring-2 ring-primary"
                      )}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <Banknote className="h-5 w-5" />
                      Cash
                    </Button>
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
                          {paymentDate ? format(paymentDate, "PPP") : "Select date"}
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
                  </div>
                </div>
                
                {/* E-Transfer Reference */}
                {paymentMethod === 'e-transfer' && (
                  <div className="space-y-2">
                    <Label>Transaction Reference / ID</Label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Enter e-transfer reference number"
                    />
                  </div>
                )}
                
                {/* Cash Received By */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-2">
                    <Label>Who Received the Cash? *</Label>
                    <Select value={paymentReceivedBy} onValueChange={(v) => setPaymentReceivedBy(v as 'cleaner' | 'company')}>
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
                    {paymentReceivedBy === 'cleaner' && (
                      <p className="text-xs text-warning">
                        Note: Cash received by cleaner will be tracked as "Cash Pending Transfer" until confirmed by admin.
                      </p>
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