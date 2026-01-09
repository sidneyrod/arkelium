import React, { useRef, useState } from 'react';
import { Camera, Loader2, X, Plus, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
  sublabel?: string;
  readOnly?: boolean;
  companyId?: string;
  jobId?: string;
  photoPrefix?: string;
  className?: string;
}

export const PhotoGallery = ({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  label,
  sublabel,
  readOnly = false,
  companyId,
  jobId,
  photoPrefix = 'photo',
  className,
}: PhotoGalleryProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    if (!companyId || !jobId) {
      toast.error('Missing company or job information');
      return;
    }

    if (photos.length >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);

    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${jobId}/${photoPrefix}-${Date.now()}-${photos.length}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(data.path);
      onPhotosChange([...photos, urlData.publicUrl]);
      toast.success('Photo uploaded');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) Array.from(files).forEach(handlePhotoUpload);
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            {label}
          </h4>
          <span className="text-xs text-muted-foreground">({photos.length}/{maxPhotos})</span>
        </div>
      )}
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={readOnly || uploading} />
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
            <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
            {!readOnly && (
              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePhoto(index)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {!readOnly && photos.length < maxPhotos && (
          <div className={cn("aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors border-border hover:border-primary hover:bg-muted/50", uploading && "pointer-events-none opacity-70")} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <><Plus className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground mt-1">Add</span></>}
          </div>
        )}
      </div>
    </div>
  );
};

export const PhotoGalleryReadOnly = ({ photos, label, className }: { photos: string[]; label?: string; className?: string }) => {
  if (!photos || photos.length === 0) return null;
  return (
    <div className={cn('space-y-2', className)}>
      {label && <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Image className="h-3 w-3" />{label}</h4>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo, index) => (
          <div key={index} className="shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-border">
            <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};
