
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { BookText, Home, LogOut, PlusCircle, UserCircle, FileText, Settings, DollarSign, Bell, Loader2, MessageSquare, CornerDownRight, Heart as HeartIcon, ThumbsUp } from 'lucide-react'; 
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
import { siteConfig } from '@/config/site';

export default function Header() {
  const { user, userProfile, signOut, loading: authLoading, isAdmin } = useAuth(); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc')); 

      setLoadingNotifications(true); 
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let currentUnreadCount = 0;
        const allFetchedNotifications: Notification[] = [];
        snapshot.forEach(docSnap => {
          const notif = { id: docSnap.id, ...docSnap.data() } as Notification;
          if (!notif.isRead) {
            currentUnreadCount++;
          }
          allFetchedNotifications.push(notif);
        });
        setUnreadCount(currentUnreadCount);
        
        allFetchedNotifications.sort((a, b) => {
            if (a.isRead !== b.isRead) {
                return a.isRead ? 1 : -1; 
            }
            return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
        });
        setNotifications(allFetchedNotifications.slice(0,5)); 
        setLoadingNotifications(false);

      }, (error) => {
        console.error("Error with notification listener:", error);
        setLoadingNotifications(false);
      });

      return () => unsubscribe();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoadingNotifications(false); 
    }
  }, [user]);


  const handleMarkNotificationsAsRead = async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const notifRef = doc(db, 'users', user.uid, 'notifications', id);
      batch.update(notifRef, { isRead: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  
  const handleNotificationDropdownOpen = (open: boolean) => {
    if (open && user) {
        const unreadDisplayed = notifications.filter(n => !n.isRead && notifications.some(dispNotif => dispNotif.id === n.id)).map(n => n.id);
        if (unreadDisplayed.length > 0) {
          handleMarkNotificationsAsRead(unreadDisplayed);
        }
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatCompactDistanceToNow = (timestamp?: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true, includeSeconds: false })
      .replace('about ', '')
      .replace('less than a minute ago', '<1m')
      .replace(' minutes ago', 'm')
      .replace(' minute ago', 'm')
      .replace(' hours ago', 'h')
      .replace(' hour ago', 'h')
      .replace(' days ago', 'd')
      .replace(' day ago', 'd');
  };
  
  const getNotificationIcon = (type: Notification['type']) => {
    if (type === 'new_reply') return <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0" />;
    if (type === 'new_like') return <HeartIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />;
    if (type === 'new_post_like') return <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />;
    return <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />;
  };
  
  const getNotificationText = (notif: Notification) => {
    if (notif.type === 'new_reply') {
      return <><span className="font-semibold">{notif.replierName}</span> replied to a comment on:</>;
    }
    if (notif.type === 'new_like') {
      let text = <><span className="font-semibold">{notif.likerName}</span> liked your comment</>;
      if (notif.likedCommentTextSnippet) {
        text = <><span className="font-semibold">{notif.likerName}</span> liked: <span className="italic">"{notif.likedCommentTextSnippet}"</span> on:</>;
      }
      return text;
    }
    if (notif.type === 'new_post_like') {
        return <><span className="font-semibold">{notif.likerName}</span> liked your post:</>;
    }
    return <><span className="font-semibold">{notif.commenterName}</span> commented on:</>;
  };


  return (
    <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookText className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold text-foreground">{siteConfig.name}</h1>
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
                      href={notif.link || `/blog/${notif.blogSlug}#comment-${notif.parentCommentId || notif.commentId}`}
                      className={`flex items-start gap-2.5 py-2 px-3 w-full rounded-md transition-colors ${
                        !notif.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                          if (!notif.isRead) {
                              handleMarkNotificationsAsRead([notif.id]);
                          }
                      }}
                    >
                      <div className={`${!notif.isRead ? 'text-primary' : 'text-muted-foreground'}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-xs ${!notif.isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                           {getNotificationText(notif)}
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
                        {formatCompactDistanceToNow(notif.createdAt)}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                ))}
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
