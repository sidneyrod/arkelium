import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Clock, MapPin, User, Loader2, X, Play, AlertTriangle } from 'lucide-react';
import { ScheduledJob } from '@/stores/scheduleStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StartServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ScheduledJob | null;
  onStart: (jobId: string, beforePhoto?: string) => void;
}

const StartServiceModal = ({ open, onOpenChange, job, onStart }: StartServiceModalProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isEnglish = language === 'en';

  const beforePhotoRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [showConfirmNoPhoto, setShowConfirmNoPhoto] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    if (!job || !user?.profile?.company_id) return;

    setUploadingBefore(true);

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
      const fileName = `${user.profile.company_id}/${job.id}/before-${Date.now()}.${fileExt}`;

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

      setBeforePhoto(urlData.publicUrl);
      toast.success(isEnglish ? 'Before photo uploaded' : 'Foto do antes enviada');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingBefore(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const removePhoto = () => {
    setBeforePhoto(null);
  };

  const handleStart = () => {
    if (!job || isSubmitting) return;

    // If no photo and not confirmed, ask for confirmation
    if (!beforePhoto && !showConfirmNoPhoto) {
      setShowConfirmNoPhoto(true);
      return;
    }

    setIsSubmitting(true);
    onOpenChange(false);
    onStart(job.id, beforePhoto || undefined);
    
    // Reset state
    setTimeout(() => {
      setIsSubmitting(false);
      setBeforePhoto(null);
      setShowConfirmNoPhoto(false);
    }, 500);
  };

  const handleCancel = () => {
    setBeforePhoto(null);
    setShowConfirmNoPhoto(false);
    onOpenChange(false);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            {isEnglish ? 'Start Service' : 'Iniciar Serviço'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          {/* Job Info */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{job.clientName}</h3>
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

          {/* Before Photo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                {isEnglish ? 'Before Photo' : 'Foto do Antes'}
              </h4>
              <span className="text-xs text-muted-foreground">
                ({isEnglish ? 'Optional but recommended' : 'Opcional mas recomendado'})
              </span>
            </div>
            
            <input
              ref={beforePhotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div
              className={cn(
                "h-32 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden",
                beforePhoto ? "border-success bg-success/5" : "border-border hover:border-primary hover:bg-muted/50",
                uploadingBefore && "pointer-events-none opacity-70"
              )}
              onClick={() => !uploadingBefore && !beforePhoto && beforePhotoRef.current?.click()}
            >
              {uploadingBefore ? (
                <div className="text-center">
                  <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEnglish ? 'Uploading...' : 'Enviando...'}
                  </p>
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
                      removePhoto();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEnglish ? 'Upload before photo' : 'Enviar foto do antes'}
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {isEnglish 
                ? 'Taking a before photo helps document the initial state of the property.'
                : 'Tirar uma foto do antes ajuda a documentar o estado inicial do imóvel.'}
            </p>
          </div>

          {/* Warning if no photo */}
          {showConfirmNoPhoto && !beforePhoto && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {isEnglish ? 'No before photo' : 'Sem foto do antes'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {isEnglish 
                      ? 'Are you sure you want to start without a before photo?'
                      : 'Tem certeza que deseja iniciar sem uma foto do antes?'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {isEnglish ? 'Cancel' : 'Cancelar'}
          </Button>
          <Button 
            onClick={handleStart}
            disabled={isSubmitting || uploadingBefore}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {showConfirmNoPhoto && !beforePhoto
              ? (isEnglish ? 'Start Anyway' : 'Iniciar Mesmo Assim')
              : (isEnglish ? 'Start Service' : 'Iniciar Serviço')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartServiceModal;
