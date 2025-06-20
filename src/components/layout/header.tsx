
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { BookText, Home, LogOut, PlusCircle, UserCircle, FileText, Settings, DollarSign, Bell, Loader2 } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import React, { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function Header() {
  const { user, userProfile, signOut, loading: authLoading, isAdmin } = useAuth(); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoadingNotifications(true);
    try {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      
      // Fetch unread count
      const unreadQuery = query(notificationsRef, where('isRead', '==', false));
      const unreadSnapshot = await getDocs(unreadQuery);
      setUnreadCount(unreadSnapshot.size);

      // Fetch latest 5 unread notifications for display, then latest 5 read if not enough unread.
      let fetchedNotifications: Notification[] = [];
      const unreadDisplayQuery = query(notificationsRef, where('isRead', '==', false), orderBy('createdAt', 'desc'), limit(5));
      const unreadDisplaySnapshot = await getDocs(unreadDisplayQuery);
      unreadDisplaySnapshot.forEach(doc => fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification));
      
      if (fetchedNotifications.length < 5) {
        const readDisplayQuery = query(
            notificationsRef, 
            where('isRead', '==', true), 
            orderBy('createdAt', 'desc'), 
            limit(5 - fetchedNotifications.length)
        );
        const readDisplaySnapshot = await getDocs(readDisplayQuery);
        readDisplaySnapshot.forEach(doc => fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification));
      }
      // Sort combined by date again if mixing read/unread
      fetchedNotifications.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

      setNotifications(fetchedNotifications.slice(0, 5)); // Ensure we only show max 5

    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Optionally show a toast error
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up a listener for real-time updates if desired, or re-fetch periodically
      const interval = setInterval(fetchNotifications, 60000); // Re-fetch every minute
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const handleMarkNotificationsAsRead = async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const notifRef = doc(db, 'users', user.uid, 'notifications', id);
      batch.update(notifRef, { isRead: true });
    });
    try {
      await batch.commit();
      // Optimistically update UI or re-fetch
      setNotifications(prev => prev.map(n => notificationIds.includes(n.id) ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  
  const handleNotificationDropdownOpen = (open: boolean) => {
    if (open && user) {
       // Fetch fresh notifications when opening, as some might have been read elsewhere
      fetchNotifications().then(() => {
        const unreadToMark = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadToMark.length > 0) {
          handleMarkNotificationsAsRead(unreadToMark);
        }
      });
    }
  };


  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookText className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold text-foreground">Blogchain</h1>
        </Link>
        
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>

          {user && (
            <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
              <Link href="/blog/create" className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Link>
            </Button>
          )}

          {user && (
            <DropdownMenu onOpenChange={handleNotificationDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-min p-0.5 text-xs flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notifications
                  {loadingNotifications && <Loader2 className="h-4 w-4 animate-spin" />}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 && !loadingNotifications && (
                  <DropdownMenuItem disabled className="text-muted-foreground text-center py-4">
                    No new notifications.
                  </DropdownMenuItem>
                )}
                {notifications.map(notif => (
                  <DropdownMenuItem key={notif.id} asChild className={`cursor-pointer ${!notif.isRead ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                    <Link href={notif.link || `/blog/${notif.blogSlug}`} className="flex flex-col items-start whitespace-normal py-2">
                      <p className="text-sm font-medium">
                        <span className="font-semibold">{notif.commenterName}</span> commented on <span className="text-primary">{notif.blogTitle}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                ))}
                {/* Consider adding a "View All Notifications" link here later */}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {authLoading ? (
            <div className="h-8 w-8 sm:w-20 bg-muted rounded-md animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.photoURL || user.photoURL || undefined} alt={userProfile?.displayName || user.displayName || 'User'} />
                    <AvatarFallback>{getInitials(userProfile?.displayName || user.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile?.displayName || user.displayName || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.uid}`} className="flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/my-blogs`} className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    My Blogs
                  </Link>
                </DropdownMenuItem>
                {userProfile?.isMonetizationApproved && (
                   <DropdownMenuItem asChild>
                    <Link href="/monetization" className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Monetization
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && ( 
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3">
                <Link href="/auth/login">Log In</Link>
              </Button>
              <Button size="sm" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground px-2 sm:px-3">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
