
"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'; // Added query and where
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserTable from './user-table';

async function getAllUserProfiles(): Promise<UserProfile[]> {
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }));
}

async function getUserPostCount(userId: string): Promise<number> {
    const blogsCol = collection(db, 'blogs');
    // This query is simplified. For performance on large datasets, consider aggregated counts.
    const q = query(blogsCol, where('authorId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.size;
}


export default function UserManagementTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userPostCounts, setUserPostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsersData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await getAllUserProfiles();
      setUsers(fetchedUsers);

      // Fetch post counts for each user
      const counts: Record<string, number> = {};
      for (const user of fetchedUsers) {
        counts[user.uid] = await getUserPostCount(user.uid);
      }
      setUserPostCounts(counts);

    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load user data. Please try again.");
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, updates);
      toast({ title: 'User Updated', description: 'User details have been successfully updated.' });
      // Re-fetch users to reflect changes, or update local state
      fetchUsersData();
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast({ title: 'Update Error', description: err.message || 'Failed to update user.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2" /> User Management</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2" /> User Management</CardTitle>
        </CardHeader>
        <CardContent className="text-center p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Users</p>
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Users className="mr-2" /> User Management</CardTitle>
        <CardDescription>View, manage, and moderate application users.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-5">No users found.</p>
        ) : (
          <UserTable users={users} onUpdateUser={handleUpdateUser} postCounts={userPostCounts} />
        )}
      </CardContent>
    </Card>
  );
}

