
"use client";

import React, { useState } from 'react';
import type { UserProfile, Blog } from '@/lib/types';
import BlogCard from '@/components/blog/blog-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, BarChart3, Coins, Eye, Edit } from 'lucide-react';
import { useEarningsSettings } from '@/context/earnings-settings-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import EditProfileDialog from './edit-profile-dialog'; 

interface UserProfileViewProps {
  profile: UserProfile;
  blogs: Blog[];
}

export default function UserProfileView({ profile, blogs }: UserProfileViewProps) {
  const { baseEarningPerView } = useEarningsSettings();
  const { user } = useAuth();

  // Local state to manage profile data and dialog visibility
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
    setCurrentProfile(prev => ({ ...prev, ...updates }));
    // This updates the UI instantly. The AuthContext will also update eventually on its own listener.
  };

  const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);
  const totalVirtualEarnings = blogs.reduce((sum, blog) => sum + (blog.views * baseEarningPerView), 0).toFixed(2);

  const isOwner = user?.uid === currentProfile.uid;

  return (
    <>
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <header className="mb-12 p-6 bg-card rounded-xl shadow-lg flex flex-col sm:flex-row items-center gap-6 relative">
          {isOwner && (
             <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
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
              <span className="flex items-center font-semibold text-foreground">
                <Coins className="h-4 w-4 mr-1.5 text-yellow-500" /> ${totalVirtualEarnings} Virtual Earnings
              </span>
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-2xl sm:text-3xl font-headline font-semibold mb-8 text-foreground">
            {currentProfile.displayName ? `${currentProfile.displayName.split(' ')[0]}'s Blogs` : 'Published Blogs'}
          </h2>
          {blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10 text-lg">
              This user hasn&apos;t published any blogs yet.
            </p>
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
