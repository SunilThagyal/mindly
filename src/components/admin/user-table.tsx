
"use client";

import type { UserProfile } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import UserTableRowActions from './user-table-row-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, CheckCircle, XCircle } from 'lucide-react';

interface UserTableProps {
  users: UserProfile[];
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  userStats: Record<string, { postCount: number; totalViews: number }>;
  totalWithdrawnAmounts: Record<string, number>;
}

export default function UserTable({ users, onUpdateUser, userStats, totalWithdrawnAmounts }: UserTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Monetization</TableHead>
            <TableHead className="text-center">Posts</TableHead>
            <TableHead className="text-center">Views</TableHead>
            <TableHead className="text-center">Balance</TableHead>
            <TableHead className="text-center">Withdrawn</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const stats = userStats[user.uid] || { postCount: 0, totalViews: 0 };
            const withdrawn = totalWithdrawnAmounts[user.uid] || 0;
            return (
              <TableRow key={user.uid}>
                <TableCell>
                  <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle size={18}/>}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={user.isBlocked ? 'destructive' : 'secondary'}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </Badge>
                    <Badge variant={user.postingRestricted ? 'outline' : 'secondary'} className={user.postingRestricted ? "border-yellow-500 text-yellow-600" : ""}>
                      {user.postingRestricted ? 'Restricted' : 'Allowed'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isMonetizationApproved ? 'default' : 'secondary'} className={user.isMonetizationApproved ? "bg-green-600 hover:bg-green-700" : ""}>
                    {user.isMonetizationApproved ? (
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                    )}
                    {user.isMonetizationApproved ? 'Approved' : 'Not Approved'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{stats.postCount}</TableCell>
                <TableCell className="text-center">{stats.totalViews}</TableCell>
                <TableCell className="text-center font-medium">${(user.virtualEarnings || 0).toFixed(2)}</TableCell>
                <TableCell className="text-center font-medium">${withdrawn.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <UserTableRowActions user={user} onUpdateUser={onUpdateUser} stats={stats} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
