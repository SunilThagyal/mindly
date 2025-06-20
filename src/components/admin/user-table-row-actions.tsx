
"use client";

import { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Slash, ShieldCheck, ShieldOff, MessageSquareWarning } from 'lucide-react';
import EditUserProfileDialog from './edit-user-profile-dialog';
import RestrictPostingDialog from './restrict-posting-dialog';

interface UserTableRowActionsProps {
  user: UserProfile;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
}

export default function UserTableRowActions({ user, onUpdateUser }: UserTableRowActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);

  const handleBlockToggle = () => {
    onUpdateUser(user.uid, { isBlocked: !user.isBlocked });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBlockToggle}>
            {user.isBlocked ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldOff className="mr-2 h-4 w-4" />}
            {user.isBlocked ? 'Unblock User' : 'Block User'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsRestrictModalOpen(true)}>
            <MessageSquareWarning className="mr-2 h-4 w-4" />
            {user.postingRestricted ? 'Manage Posting Restriction' : 'Restrict Posting'}
          </DropdownMenuItem>
          {/* Add more actions here: e.g., view posts, adjust ad settings */}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserProfileDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={(updates) => {
          onUpdateUser(user.uid, updates);
          setIsEditModalOpen(false);
        }}
      />
      <RestrictPostingDialog
        isOpen={isRestrictModalOpen}
        onClose={() => setIsRestrictModalOpen(false)}
        user={user}
        onSave={(updates) => {
          onUpdateUser(user.uid, updates);
          setIsRestrictModalOpen(false);
        }}
      />
    </>
  );
}
