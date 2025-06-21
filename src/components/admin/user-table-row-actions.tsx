
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
import { MoreHorizontal, Edit, ShieldOff, ShieldCheck, MessageSquareWarning, Eye, DollarSign, CheckCircle, XCircle, Info } from 'lucide-react';
import EditUserProfileDialog from './edit-user-profile-dialog';
import RestrictPostingDialog from './restrict-posting-dialog';
import { useRouter } from 'next/navigation';
import UserInfoDialog from './user-info-dialog';

interface UserTableRowActionsProps {
  user: UserProfile;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  stats: { postCount: number, totalViews: number };
}

export default function UserTableRowActions({ user, onUpdateUser, stats }: UserTableRowActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const router = useRouter();

  const handleBlockToggle = () => {
    onUpdateUser(user.uid, { isBlocked: !user.isBlocked });
  };

  const handleViewPosts = () => {
    router.push(`/admin?tab=posts&authorId=${user.uid}`);
  };

  const handleToggleMonetization = () => {
    onUpdateUser(user.uid, { isMonetizationApproved: !user.isMonetizationApproved });
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions for {user.displayName || user.email}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setIsInfoModalOpen(true)}>
            <Info className="mr-2 h-4 w-4" />
            User Info
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewPosts}>
            <Eye className="mr-2 h-4 w-4" />
            View User's Posts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleBlockToggle}>
            {user.isBlocked ? <ShieldCheck className="mr-2 h-4 w-4 text-green-600" /> : <ShieldOff className="mr-2 h-4 w-4 text-red-600" />}
            {user.isBlocked ? 'Unblock User' : 'Block User'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsRestrictModalOpen(true)}>
            <MessageSquareWarning className={`mr-2 h-4 w-4 ${user.postingRestricted ? 'text-yellow-600' : ''}`} />
            {user.postingRestricted ? 'Manage Posting Ban' : 'Ban Posting'}
          </DropdownMenuItem>
           <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleMonetization}>
            {user.isMonetizationApproved ? <XCircle className="mr-2 h-4 w-4 text-orange-500" /> : <CheckCircle className="mr-2 h-4 w-4 text-green-600" />}
            {user.isMonetizationApproved ? 'Revoke Monetization' : 'Approve Monetization'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserProfileDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={async (updates) => {
          await onUpdateUser(user.uid, updates);
          setIsEditModalOpen(false);
        }}
      />
      <RestrictPostingDialog
        isOpen={isRestrictModalOpen}
        onClose={() => setIsRestrictModalOpen(false)}
        user={user}
        onSave={async (updates) => {
          await onUpdateUser(user.uid, updates);
          setIsRestrictModalOpen(false);
        }}
      />
      <UserInfoDialog
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        user={user}
        stats={stats}
      />
    </>
  );
}
