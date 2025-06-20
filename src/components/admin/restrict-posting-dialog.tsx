
"use client";

import { useState, useEffect, FormEvent } from 'react';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface RestrictPostingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updates: Partial<Pick<UserProfile, 'postingRestricted' | 'postingRestrictionReason'>>) => Promise<void>;
}

export default function RestrictPostingDialog({ isOpen, onClose, user, onSave }: RestrictPostingDialogProps) {
  const [postingRestricted, setPostingRestricted] = useState(!!user.postingRestricted);
  const [reason, setReason] = useState(user.postingRestrictionReason || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPostingRestricted(!!user.postingRestricted);
      setReason(user.postingRestrictionReason || '');
    }
  }, [isOpen, user.postingRestricted, user.postingRestrictionReason]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSave({
      postingRestricted,
      postingRestrictionReason: postingRestricted ? reason.trim() : null,
    });
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Posting Restriction</DialogTitle>
          <DialogDescription>
            Control posting privileges for {user.displayName || user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="postingRestricted"
              checked={postingRestricted}
              onCheckedChange={setPostingRestricted}
              disabled={isSaving}
            />
            <Label htmlFor="postingRestricted" className="text-base">
              {postingRestricted ? 'Posting Restricted' : 'Posting Allowed'}
            </Label>
          </div>
          {postingRestricted && (
            <div className="space-y-1">
              <Label htmlFor="reason">Reason for Restriction (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
                disabled={isSaving}
              />
            </div>
          )}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
