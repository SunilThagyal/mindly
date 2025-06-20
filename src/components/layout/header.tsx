
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { BookText, Home, LogOut, PlusCircle, UserCircle, FileText, Settings, DollarSign, Bell, Loader2, MessageSquare } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc, writeBatch, onSnapshot } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import React, { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function Header() {
  const { user, userProfile, signOut, loading: authLoading, isAdmin } = useAuth(); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotificationsData = useCallback(async (isInitialFetch = false) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoadingNotifications(false);
      return;
    }
    if(isInitialFetch) setLoadingNotifications(true);

    try {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      
      const unreadQuery = query(notificationsRef, where('isRead', '==', false));
      const unreadSnapshot = await getDocs(unreadQuery);
      setUnreadCount(unreadSnapshot.size);

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
      
      fetchedNotifications.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setNotifications(fetchedNotifications.slice(0, 5));

    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      if(isInitialFetch) setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotificationsData(true); // Initial fetch with loading indicator
      
      // Real-time listener for unread count and recent notifications
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let currentUnreadCount = 0;
        const currentNotifications: Notification[] = [];
        snapshot.forEach(docSnap => {
          const notif = { id: docSnap.id, ...docSnap.data() } as Notification;
          if (!notif.isRead) {
            currentUnreadCount++;
          }
          if (currentNotifications.length < 5) { // Keep track of latest 5 for display
            currentNotifications.push(notif);
          }
        });
        setUnreadCount(currentUnreadCount);
        // Prioritize unread, then fill with read for display
        const displayNotifications = currentNotifications
            .sort((a,b) => (a.isRead === b.isRead) ? 0 : a.isRead ? 1 : -1) // unread first
            .slice(0,5);
        setNotifications(displayNotifications);

      }, (error) => {
        console.error("Error with notification listener:", error);
      });

      return () => unsubscribe();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotificationsData]);


  const handleMarkNotificationsAsRead = async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const notifRef = doc(db, 'users', user.uid, 'notifications', id);
      batch.update(notifRef, { isRead: true });
    });
    try {
      await batch.commit();
      // Optimistic UI update (already handled by listener, but good for immediate feedback if listener is slow)
      setNotifications(prev => prev.map(n => notificationIds.includes(n.id) ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - notificationIds.filter(id => notifications.find(n => n.id === id && !n.isRead)).length));
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  
  const handleNotificationDropdownOpen = (open: boolean) => {
    if (open && user) {
      fetchNotificationsData().then(() => { // Fetch latest before marking
        const unreadDisplayed = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadDisplayed.length > 0) {
          handleMarkNotificationsAsRead(unreadDisplayed);
        }
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatCompactDistanceToNow = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, includeSeconds: false })
      .replace('about ', '')
      .replace('less than a minute ago', '<1m ago')
      .replace(' minutes ago', 'm ago')
      .replace(' minute ago', 'm ago')
      .replace(' hours ago', 'h ago')
      .replace(' hour ago', 'h ago')
      .replace(' days ago', 'd ago')
      .replace(' day ago', 'd ago');
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
              <DropdownMenuContent className="w-80 sm:w-96" align="end">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notifications
                  {loadingNotifications && notifications.length === 0 && <Loader2 className="h-4 w-4 animate-spin" />}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 && !loadingNotifications && (
                  <DropdownMenuItem disabled className="text-muted-foreground text-center py-4 text-xs">
                    No new notifications.
                  </DropdownMenuItem>
                )}
                {notifications.map(notif => (
                  <DropdownMenuItem key={notif.id} asChild className="p-0 focus:bg-transparent cursor-pointer">
                    <Link
                      href={notif.link || `/blog/${notif.blogSlug}#comment-${notif.commentId}`}
                      className={`flex items-start gap-2.5 py-2 px-3 w-full rounded-md transition-colors ${
                        !notif.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent'
                      }`}
                      onClick={() => {
                          if (!notif.isRead) {
                              handleMarkNotificationsAsRead([notif.id]);
                          }
                      }}
                    >
                      <MessageSquare
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          !notif.isRead ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-xs ${!notif.isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          <span className="font-semibold">{notif.commenterName}</span>
                          <span className="ml-1">commented on:</span>
                        </p>
                        <p
                          className={`text-xs truncate ${
                            !notif.isRead ? 'text-primary' : 'text-foreground/80'
                          }`}
                          title={notif.blogTitle}
                        >
                          {notif.blogTitle}
                        </p>
                      </div>
                      <p className="ml-2 text-xs text-muted-foreground self-start whitespace-nowrap">
                        {formatCompactDistanceToNow(notif.createdAt.toDate())}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                ))}
                {/* Consider adding a "View All Notifications" link here later */}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {authLoading ? (
             <div className="flex items-center justify-center h-9 w-9">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
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

    