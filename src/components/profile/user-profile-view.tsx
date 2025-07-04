
"use client";

import React, { useState } from 'react';
import type { UserProfile, Blog } from '@/lib/types';
import BlogCard from '@/components/blog/blog-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, BarChart3, Coins, Eye, Edit, FileText, DollarSign, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import EditProfileDialog from './edit-profile-dialog'; 
import Link from 'next/link';

interface UserProfileViewProps {
  profile: UserProfile;
  blogs: Blog[];
  totalWithdrawn: number;
  fetchError?: { message: string, indexLink: string | null } | null;
}

export default function UserProfileView({ profile, blogs, totalWithdrawn, fetchError }: UserProfileViewProps) {
  const { user } = useAuth();

  // Local state to manage profile data and dialog visibility
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
    setCurrentProfile(prev => ({ ...prev, ...updates }));
    // This updates the UI instantly. The AuthContext will also update eventually on its own listener.
  };

  const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);
  const currentBalance = currentProfile.virtualEarnings || 0;
  const lifetimeEarnings = currentBalance + totalWithdrawn;

  const isOwner = user?.uid === currentProfile.uid;

  return (
    <>
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <header className="mb-12 p-6 bg-card rounded-xl shadow-lg relative">
          {isOwner && (
             <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-10 sm:pt-0">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary">
              <AvatarImage src={currentProfile.photoURL || undefined} alt={currentProfile.displayName || 'User'} />
              <AvatarFallback className="text-4xl">
                {currentProfile.displayName ? currentProfile.displayName.charAt(0).toUpperCase() : <UserCircle className="h-16 w-16" />}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-headline font-bold text-foreground mb-1">
                {currentProfile.displayName || 'Anonymous User'}
              </h1>
              {currentProfile.email && (
                <p className="text-md text-muted-foreground flex items-center justify-center sm:justify-start">
                  <Mail className="h-4 w-4 mr-2 text-primary" /> {currentProfile.email}
                </p>
              )}
              {currentProfile.bio && (
                <p className="text-sm text-foreground mt-2 max-w-md">{currentProfile.bio}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start text-sm text-muted-foreground">
                <span className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-1.5 text-primary" /> {blogs.length} Blogs Published
                </span>
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-1.5 text-primary" /> {totalViews} Total Views
                </span>
                {isOwner && (
                  <>
                    <span className="flex items-center font-semibold text-foreground" title="The amount you can currently withdraw.">
                      <Coins className="h-4 w-4 mr-1.5 text-yellow-500" /> Current Balance: ${currentBalance.toFixed(2)}
                    </span>
                     <span className="flex items-center font-semibold text-foreground" title="The total amount you have earned, including withdrawn funds.">
                      <DollarSign className="h-4 w-4 mr-1.5 text-green-500" /> Lifetime Earnings: ${lifetimeEarnings.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-2xl sm:text-3xl font-headline font-semibold mb-8 text-foreground">
            {currentProfile.displayName ? `${currentProfile.displayName.split(' ')[0]}'s Blogs` : 'Published Blogs'}
          </h2>
          {fetchError ? (
            <div className="mt-6 text-center p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg font-semibold mb-2">Error Loading Blogs</p>
                <p className="text-sm whitespace-pre-wrap mb-3">{fetchError.message}</p>
                {fetchError.indexLink ? (
                  <>
                    <p className="text-sm mb-2">
                      To fix this, please **open your browser's developer console (usually F12)**.
                      Find the error message from Firestore starting with:
                      <br />
                      <code className="bg-destructive/20 px-1 rounded text-xs">FirebaseError: The query requires an index...</code>
                    </p>
                    <p className="text-sm mb-4">
                      **CRITICAL: Click the link provided in that error message.** It will take you to the Firebase console to create the missing index.
                      Then, click 'Create Index' in the Firebase console and wait a few minutes for it to build.
                    </p>
                    <Button
                      variant="outline"
                      asChild
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <a href={fetchError.indexLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Firestore Index Link (if available)
                      </a>
                    </Button>
                     <p className="text-xs mt-3">The link above is extracted from the error. The most reliable link is in your browser console.</p>
                  </>
                ) : (
                  <p className="text-xs mt-3">Please check your browser console for more details, or try again later.</p>
                )}
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              {isOwner ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-50 mb-2" />
                  <p className="text-lg font-medium">You haven't published any blogs yet.</p>
                  <p className="text-sm max-w-md">
                    Your public profile only shows published posts. To view your drafts or create a new post, head over to your personal dashboard.
                  </p>
                  <Button asChild className="mt-2">
                    <Link href="/my-blogs">Go to My Blogs</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground">This user hasn&apos;t published any blogs yet.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {isOwner && (
        <EditProfileDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          userProfile={currentProfile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
}
