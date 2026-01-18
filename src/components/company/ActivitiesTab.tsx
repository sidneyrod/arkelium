import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useCompanyActivities, ACTIVITY_CODES, type CompanyActivity } from '@/hooks/useCompanyActivities';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  Loader2,
  Layers,
  Sparkles
} from 'lucide-react';

interface ActivitiesTabProps {
  companyId: string | null;
  isLoading?: boolean;
}

export default function ActivitiesTab({ companyId, isLoading: externalLoading }: ActivitiesTabProps) {
  const { activities, isLoading, addActivity, removeActivity, updateActivity } = useCompanyActivities(companyId || undefined);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CompanyActivity | null>(null);
  const [form, setForm] = useState({ code: '', label: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get suggestion activities that are not already added
  const availableSuggestions = Object.values(ACTIVITY_CODES).filter(
    suggestion => !activities.some(a => a.activity_code === suggestion.code)
  );

  const openAddModal = () => {
    setEditingActivity(null);
    setForm({ code: '', label: '' });
    setModalOpen(true);
  };

  const openEditModal = (activity: CompanyActivity) => {
    setEditingActivity(activity);
    setForm({ code: activity.activity_code, label: activity.activity_label });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast({
        title: 'Error',
        description: 'Activity name is required',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingActivity) {
        // Update existing
        await updateActivity.mutateAsync({ 
          id: editingActivity.id, 
          activityLabel: form.label.trim() 
        });
        toast({
          title: 'Success',
          description: 'Activity updated successfully'
        });
      } else {
        // Create new
        const code = form.code.trim() || form.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        await addActivity.mutateAsync({
          activityCode: code,
          activityLabel: form.label.trim()
        });
        toast({
          title: 'Success',
          description: 'Activity added successfully'
        });
      }
      setModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save activity',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (activity: CompanyActivity) => {
    // Confirmation before deletion
    if (!window.confirm(`Remove "${activity.activity_label}"? This will hide it from booking options.`)) {
      return;
    }

    try {
      await removeActivity.mutateAsync(activity.id);
      toast({
        title: 'Activity removed',
        description: `${activity.activity_label} has been deactivated`,
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: 'Unable to remove activity',
        description: 'Please try again or contact support if the issue persists.',
        variant: 'destructive',
        duration: 5000,
      });
      console.error('Activity removal error:', error);
    }
  };

  const handleQuickAdd = async (suggestion: { code: string; label: string }) => {
    try {
      await addActivity.mutateAsync({
        activityCode: suggestion.code,
        activityLabel: suggestion.label
      });
      toast({
        title: 'Success',
        description: `${suggestion.label} added successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add activity',
        variant: 'destructive'
      });
    }
  };

  if (externalLoading || isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!companyId) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center text-muted-foreground">
          Select a company to manage activities
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Service Activities
              </CardTitle>
              <CardDescription className="text-xs">
                Define the types of services your business offers. These will appear in the booking modal.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAddModal} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activities configured yet</p>
              <p className="text-xs mt-1">Add activities to enable service booking</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div>
                      <p className="text-sm font-medium">{activity.activity_label}</p>
                      <p className="text-xs text-muted-foreground">Code: {activity.activity_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditModal(activity)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(activity)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Suggestions */}
          {availableSuggestions.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Quick Add Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((suggestion) => (
                  <Badge
                    key={suggestion.code}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3"
                    onClick={() => handleQuickAdd(suggestion)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {suggestion.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activity-label">Activity Name *</Label>
              <Input
                id="activity-label"
                value={form.label}
                onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Cleaning Services, Snow Removal..."
              />
            </div>
            {!editingActivity && (
              <div className="space-y-2">
                <Label htmlFor="activity-code">
                  Code (optional)
                  <span className="text-xs text-muted-foreground ml-2">
                    Auto-generated if left empty
                  </span>
                </Label>
                <Input
                  id="activity-code"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="e.g., cleaning, snow_removal..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingActivity ? 'Save Changes' : 'Add Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
