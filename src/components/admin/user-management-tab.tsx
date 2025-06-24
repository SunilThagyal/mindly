
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Users, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserTable from './user-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

async function getAllUserProfiles(): Promise<UserProfile[]> {
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }));
}

async function getUserStats(userId: string): Promise<{ postCount: number; totalViews: number }> {
    const blogsCol = collection(db, 'blogs');
    // Only count published posts and their views for monetization eligibility
    const q = query(blogsCol, where('authorId', '==', userId), where('status', '==', 'published'));
    const snapshot = await getDocs(q);

    let totalViews = 0;
    snapshot.docs.forEach(doc => {
        totalViews += doc.data().views || 0;
    });

    return {
        postCount: snapshot.size,
        totalViews,
    };
}


export default function UserManagementTab() {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userStats, setUserStats] = useState<Record<string, { postCount: number, totalViews: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlocked, setFilterBlocked] = useState(false);
  const [filterRestricted, setFilterRestricted] = useState(false);
  const [filterEligible, setFilterEligible] = useState(false);

  const fetchUsersData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await getAllUserProfiles();
      setAllUsers(fetchedUsers);

      const stats: Record<string, { postCount: number; totalViews: number }> = {};
      for (const user of fetchedUsers) {
        stats[user.uid] = await getUserStats(user.uid);
      }
      setUserStats(stats);

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
      toast({ title: 'User Updated', description: 'User details have been successfully updated.', variant: 'success' });
      // Re-fetch users to reflect changes, or update local state for faster UI update
      setAllUsers(prevUsers => prevUsers.map(u => u.uid === userId ? {...u, ...updates} : u));
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast({ title: 'Update Error', description: err.message || 'Failed to update user.', variant: 'destructive' });
    }
  };
  
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch = searchTerm.trim() === '' ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBlocked = !filterBlocked || user.isBlocked === true;
      const matchesRestricted = !filterRestricted || user.postingRestricted === true;

      const matchesEligible = (() => {
        if (!filterEligible) return true;
        const stats = userStats[user.uid];
        if (!stats) return false;
        const isEligible = stats.postCount >= 10 && stats.totalViews >= 500;
        return isEligible && !user.isMonetizationApproved;
      })();
      
      return matchesSearch && matchesBlocked && matchesRestricted && matchesEligible;
    });
  }, [allUsers, searchTerm, filterBlocked, filterRestricted, filterEligible, userStats]);

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
        <CardDescription>View, manage, and moderate application users. Found {filteredUsers.length} of {allUsers.length} users.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
          <h3 className="text-lg font-semibold">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1 lg:col-span-1">
              <Label htmlFor="userSearch">Search User (Name/Email)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userSearch"
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                {searchTerm && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2 sm:pt-6">
              <Checkbox
                id="filterBlocked"
                checked={filterBlocked}
                onCheckedChange={(checked) => setFilterBlocked(checked as boolean)}
              />
              <Label htmlFor="filterBlocked" className="cursor-pointer">Show Blocked Only</Label>
            </div>
            <div className="flex items-center space-x-2 pt-2 sm:pt-6">
              <Checkbox
                id="filterRestricted"
                checked={filterRestricted}
                onCheckedChange={(checked) => setFilterRestricted(checked as boolean)}
              />
              <Label htmlFor="filterRestricted" className="cursor-pointer">Show Posting Restricted Only</Label>
            </div>
             <div className="flex items-center space-x-2 pt-2 sm:pt-6">
              <Checkbox
                id="filterEligible"
                checked={filterEligible}
                onCheckedChange={(checked) => setFilterEligible(checked as boolean)}
              />
              <Label htmlFor="filterEligible" className="cursor-pointer">Eligible for Monetization</Label>
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-5">No users match the current filters.</p>
        ) : (
          <UserTable users={filteredUsers} onUpdateUser={handleUpdateUser} userStats={userStats} />
        )}
      </CardContent>
    </Card>
  );
}
