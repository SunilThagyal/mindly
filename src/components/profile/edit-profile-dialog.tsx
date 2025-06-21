
"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, UserCircle, UploadCloud } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/config/cloudinary';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onProfileUpdate: (updates: Partial<UserProfile>) => void;
}

export default function EditProfileDialog({ isOpen, onClose, userProfile, onProfileUpdate }: EditProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userProfile) {
      setDisplayName(userProfile.displayName || '');
      setBio(userProfile.bio || '');
      setPhotoPreview(userProfile.photoURL || null);
      setPhotoFile(null); // Reset file on open
    }
    // Only re-run the effect if the dialog is opened or the user's core data changes.
    // This prevents loops if the parent `userProfile` object reference changes unnecessarily.
  }, [isOpen, userProfile?.displayName, userProfile?.bio, userProfile?.photoURL]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > 5 * 1024 * 1024) { 
        toast({ title: 'Image too large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive'});
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) {
        toast({ title: 'Display Name Required', description: 'Please enter a display name.', variant: 'destructive'});
        return;
    };
    setIsSaving(true);
    
    let uploadedPhotoURL = userProfile.photoURL;

    if (photoFile) {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset') {
            toast({ title: 'Cloudinary Not Configured', description: 'Cannot upload profile picture. Please check environment variables.', variant: 'destructive' });
            setIsSaving(false);
            return;
        }
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'profile_pictures');

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
            });
            const data = await response.json();
            if (data.secure_url) {
                uploadedPhotoURL = data.secure_url;
            } else {
                throw new Error(data.error?.message || 'Cloudinary upload failed.');
            }
        } catch (error) {
            toast({ title: 'Image Upload Error', description: (error as Error).message, variant: 'destructive' });
            setIsSaving(false);
            return;
        }
    }

    const updates: Partial<UserProfile> = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      photoURL: uploadedPhotoURL,
    };

    try {
        // Update Firebase Auth profile
        await updateProfile(user, {
            displayName: updates.displayName,
            photoURL: updates.photoURL,
        });

        // Update Firestore document
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, updates);

        toast({ title: 'Profile Updated!', description: 'Your profile has been saved successfully.' });
        onProfileUpdate(updates);
        onClose();
    } catch (error: any) {
        toast({ title: 'Save Error', description: error.message || 'Failed to update profile.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
          <DialogDescription>
            Update your public profile information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
                 <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={photoPreview || undefined} alt={displayName || 'User'} />
                    <AvatarFallback className="text-3xl">
                        {displayName ? displayName.charAt(0).toUpperCase() : <UserCircle className="h-12 w-12" />}
                    </AvatarFallback>
                </Avatar>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture">Profile Picture</Label>
                    <Input id="picture" type="file" accept="image/*" onChange={handlePhotoChange} disabled={isSaving} />
                </div>
            </div>
          <div className="space-y-1">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us a little about yourself"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              disabled={isSaving}
            />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSave} disabled={isSaving || !displayName.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
