import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Clock, MapPin, User, Loader2, X, Play, AlertTriangle, Plus } from 'lucide-react';
import { ScheduledJob } from '@/stores/scheduleStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StartServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ScheduledJob | null;
  onStart: (jobId: string, beforePhotos?: string[]) => void;
}

const MAX_PHOTOS = 10;

const StartServiceModal = ({ open, onOpenChange, job, onStart }: StartServiceModalProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isEnglish = language === 'en';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showConfirmNoPhoto, setShowConfirmNoPhoto] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    if (!job || !user?.profile?.company_id) return;

    if (beforePhotos.length >= MAX_PHOTOS) {
      toast.error(isEnglish ? `Maximum ${MAX_PHOTOS} photos allowed` : `Máximo ${MAX_PHOTOS} fotos permitidas`);
      return;
    }

    setUploading(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(isEnglish ? 'Please select an image file' : 'Por favor, selecione uma imagem');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(isEnglish ? 'File size must be less than 10MB' : 'O arquivo deve ter menos de 10MB');
        return;
      }

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.profile.company_id}/${job.id}/before-${Date.now()}-${beforePhotos.length}.${fileExt}`;

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

      setBeforePhotos(prev => [...prev, urlData.publicUrl]);
      toast.success(isEnglish ? 'Photo uploaded' : 'Foto enviada');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error(isEnglish ? 'Failed to upload photo' : 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Upload files sequentially
      Array.from(files).forEach((file) => {
        handlePhotoUpload(file);
      });
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    if (!job || isSubmitting) return;

    // If no photos and not confirmed, ask for confirmation
    if (beforePhotos.length === 0 && !showConfirmNoPhoto) {
      setShowConfirmNoPhoto(true);
      return;
    }

    setIsSubmitting(true);
    onOpenChange(false);
    onStart(job.id, beforePhotos.length > 0 ? beforePhotos : undefined);
    
    // Reset state
    setTimeout(() => {
      setIsSubmitting(false);
      setBeforePhotos([]);
      setShowConfirmNoPhoto(false);
    }, 500);
  };

  const handleCancel = () => {
    setBeforePhotos([]);
    setShowConfirmNoPhoto(false);
    onOpenChange(false);
  };

  const canAddMore = beforePhotos.length < MAX_PHOTOS;

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

          {/* Before Photos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                {isEnglish ? 'Before Photos' : 'Fotos do Antes'}
              </h4>
              <span className="text-xs text-muted-foreground">
                ({beforePhotos.length}/{MAX_PHOTOS})
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {isEnglish 
                ? 'Document different rooms or areas. Take photos of any existing issues or damage.'
                : 'Documente diferentes cômodos ou áreas. Tire fotos de quaisquer problemas ou danos existentes.'}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Photo Grid */}
            <div className="grid grid-cols-4 gap-2">
              {/* Existing Photos */}
              {beforePhotos.map((photo, index) => (
                <div
                  key={`${photo}-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
                >
                  <img
                    src={photo}
                    alt={`Before ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add Photo Button */}
              {canAddMore && (
                <div
                  className={cn(
                    "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
                    "border-border hover:border-primary hover:bg-muted/50",
                    uploading && "pointer-events-none opacity-70"
                  )}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {isEnglish ? 'Add' : 'Adicionar'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {beforePhotos.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                {isEnglish ? 'Optional but recommended' : 'Opcional mas recomendado'}
              </p>
            )}
          </div>

          {/* Warning if no photos */}
          {showConfirmNoPhoto && beforePhotos.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {isEnglish ? 'No before photos' : 'Sem fotos do antes'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {isEnglish 
                      ? 'Are you sure you want to start without before photos?'
                      : 'Tem certeza que deseja iniciar sem fotos do antes?'}
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
            disabled={isSubmitting || uploading}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {showConfirmNoPhoto && beforePhotos.length === 0
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
