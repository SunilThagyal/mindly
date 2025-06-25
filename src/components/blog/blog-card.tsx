
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Blog } from '@/lib/types';
import { Eye, Clock, UserCircle, Coins } from 'lucide-react';
import { useEarningsSettings } from '@/context/earnings-settings-context';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import React from 'react';

interface BlogCardProps {
  blog: Blog;
}

const BlogCard = React.memo(function BlogCard({ blog }: BlogCardProps) {
  const { baseEarningPerView } = useEarningsSettings();
  const { user, userProfile } = useAuth(); // Get current user and profile

  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt.seconds * 1000).toLocaleDateString()
    : 'Not published';
  
  const earnings = (blog.views * baseEarningPerView).toFixed(2);

  // Check if the current user is the author and is approved for monetization
  const canShowEarnings = user?.uid === blog.authorId && userProfile?.isMonetizationApproved;
  const isGeneratedCover = blog.coverImageUrl?.includes('api.a0.dev');

  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full animate-fade-in">
      <Link href={`/blog/${blog.slug}`} className="block">
        <div className="relative w-full h-48 sm:h-56 bg-black overflow-hidden">
           {/* Blurred background image */}
            <Image
                src={blog.coverImageUrl || `https://placehold.co/600x400.png`}
                alt="" // Decorative
                layout="fill"
                objectFit="cover"
                className="filter blur-lg scale-110 opacity-70"
                aria-hidden="true"
            />
            {/* Main, contained image */}
            <Image
                src={blog.coverImageUrl || `https://placehold.co/600x400.png`}
                alt={blog.title}
                layout="fill"
                objectFit="contain"
                className="relative z-10 drop-shadow-lg"
                data-ai-hint={isGeneratedCover ? "generated banner" : (blog.coverImageUrl ? "article cover" : "placeholder")}
            />
        </div>
      </Link>
      <CardHeader className="p-4 pb-2">
        <Link href={`/blog/${blog.slug}`} className="block">
          <CardTitle className="text-xl font-headline hover:text-primary transition-colors duration-200 leading-tight h-[3.25rem] line-clamp-2">
            {blog.title}
          </CardTitle>
        </Link>
        <div className="flex items-center text-xs text-muted-foreground pt-1">
          {blog.authorPhotoURL ? (
            <Image src={blog.authorPhotoURL} alt={blog.authorDisplayName || 'author'} width={20} height={20} className="rounded-full mr-1.5" />
          ) : (
            <UserCircle className="h-4 w-4 mr-1.5" />
          )}
          <span>{blog.authorDisplayName || 'Anonymous'}</span>
          <span className="mx-1.5">•</span>
          <span>{formattedDate}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex-grow">
        {/* A short snippet could go here if available, or remove this if not needed */}
        {/* <p className="text-sm text-muted-foreground line-clamp-3">{blog.content.substring(0,150)}...</p> */}
        <div className="mt-2 flex flex-wrap gap-2">
          {blog.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 flex justify-between items-center text-sm text-muted-foreground border-t">
        <div className="flex items-center gap-3">
          <span className="flex items-center" title="Views">
            <Eye className="h-4 w-4 mr-1 text-primary" /> {blog.views}
          </span>
          <span className="flex items-center" title="Reading time">
            <Clock className="h-4 w-4 mr-1 text-primary" /> {blog.readingTime} min
          </span>
        </div>
         {canShowEarnings && (
           <span className="flex items-center font-medium" title="Virtual Earnings">
              <Coins className="h-4 w-4 mr-1 text-yellow-500" /> ${earnings}
            </span>
         )}
      </CardFooter>
    </Card>
  );
});

export default BlogCard;
