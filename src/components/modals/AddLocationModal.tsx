import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, MapPin } from 'lucide-react';

export interface LocationFormData {
  id?: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  accessInstructions: string;
  alarmCode: string;
  parkingInfo: string;
  hasPets: boolean;
  petDetails: string;
  isPrimary: boolean;
  notes: string;
}

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LocationFormData) => void;
  editLocation?: LocationFormData | null;
  isLoading?: boolean;
}

const AddLocationModal = ({
  open,
  onOpenChange,
  onSubmit,
  editLocation,
  isLoading = false,
}: AddLocationModalProps) => {
  const { t } = useLanguage();
  const [showAlarmCode, setShowAlarmCode] = useState(false);
  
  const [formData, setFormData] = useState<LocationFormData>({
    address: '',
    city: '',
    province: 'Ontario',
    postalCode: '',
    accessInstructions: '',
    alarmCode: '',
    parkingInfo: '',
    hasPets: false,
    petDetails: '',
    isPrimary: false,
    notes: '',
  });

  useEffect(() => {
    if (editLocation) {
      setFormData(editLocation);
    } else {
      setFormData({
        address: '',
        city: '',
        province: 'Ontario',
        postalCode: '',
        accessInstructions: '',
        alarmCode: '',
        parkingInfo: '',
        hasPets: false,
        petDetails: '',
        isPrimary: false,
        notes: '',
      });
    }
    setShowAlarmCode(false);
  }, [editLocation, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address.trim()) return;
    onSubmit(formData);
  };

  const isEdit = !!editLocation?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {isEdit ? t.clients.editLocation : t.clients.addLocation}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">{t.clients.address} *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
              required
            />
          </div>

          {/* City, Province, Postal Code */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">{t.clients.city}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Toronto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">{t.clients.province}</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Ontario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t.clients.postalCode}</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="M5V 1A1"
              />
            </div>
          </div>

          {/* Access Instructions */}
          <div className="space-y-2">
            <Label htmlFor="accessInstructions">{t.clients.accessInstructions}</Label>
            <Textarea
              id="accessInstructions"
              value={formData.accessInstructions}
              onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
              placeholder="Enter through the back door, code is 1234..."
              rows={2}
            />
          </div>

          {/* Alarm Code */}
          <div className="space-y-2">
            <Label htmlFor="alarmCode">{t.clients.alarmCode}</Label>
            <div className="relative">
              <Input
                id="alarmCode"
                type={showAlarmCode ? 'text' : 'password'}
                value={formData.alarmCode}
                onChange={(e) => setFormData({ ...formData, alarmCode: e.target.value })}
                placeholder="••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowAlarmCode(!showAlarmCode)}
              >
                {showAlarmCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Parking Info */}
          <div className="space-y-2">
            <Label htmlFor="parkingInfo">{t.clients.parking}</Label>
            <Input
              id="parkingInfo"
              value={formData.parkingInfo}
              onChange={(e) => setFormData({ ...formData, parkingInfo: e.target.value })}
              placeholder="Street parking available, driveway..."
            />
          </div>

          {/* Has Pets */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="hasPets" className="cursor-pointer">{t.clients.pets}</Label>
              <p className="text-xs text-muted-foreground">Does this location have pets?</p>
            </div>
            <Switch
              id="hasPets"
              checked={formData.hasPets}
              onCheckedChange={(checked) => setFormData({ ...formData, hasPets: checked })}
            />
          </div>

          {/* Pet Details (conditional) */}
          {formData.hasPets && (
            <div className="space-y-2">
              <Label htmlFor="petDetails">{t.clients.petDetails}</Label>
              <Input
                id="petDetails"
                value={formData.petDetails}
                onChange={(e) => setFormData({ ...formData, petDetails: e.target.value })}
                placeholder="2 dogs, friendly..."
              />
            </div>
          )}

          {/* Is Primary */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="isPrimary" className="cursor-pointer">{t.clients.primaryLocation}</Label>
              <p className="text-xs text-muted-foreground">{t.clients.primaryLocationDescription}</p>
            </div>
            <Switch
              id="isPrimary"
              checked={formData.isPrimary}
              onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t.clients.notes}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this location..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading || !formData.address.trim()}>
              {isLoading ? t.common.loading : (isEdit ? t.common.save : t.common.add)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLocationModal;
