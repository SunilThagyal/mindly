
"use client";

import type { Blog, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Clock, UserCircle, Edit, Trash2, Coins, Loader2, Share2 } from 'lucide-react';
import { VIRTUAL_CURRENCY_RATE_PER_VIEW } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useAdSettings } from '@/context/ad-settings-context'; 
import Link from 'next/link';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AdPlaceholder from '@/components/layout/ad-placeholder';
import RelatedPosts from './related-posts';
import CommentsSection from './comments-section';
import SocialShareButtons from './social-share-buttons';

interface BlogPostViewProps {
  blog: Blog;
  authorProfile?: UserProfile | null;
}

export default function BlogPostView({ blog, authorProfile }: BlogPostViewProps) {
  const { user } = useAuth();
  const { adDensity } = useAdSettings(); 
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Draft - Not Published';

  const earnings = (blog.views * VIRTUAL_CURRENCY_RATE_PER_VIEW).toFixed(2);

  const handleDelete = async () => {
    if (!user || user.uid !== blog.authorId) {
      toast({ title: "Error", description: "You are not authorized to delete this blog.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "blogs", blog.id));
      toast({ title: "Success", description: "Blog post deleted successfully." });
      router.push("/my-blogs");
    } catch (error) {
      console.error("Error deleting blog: ", error);
      toast({ title: "Error", description: "Failed to delete blog post.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderContentWithAds = () => {
    let contentWithAds: (string | JSX.Element)[] = [];
    const contentParts = blog.content.split(/(<\/p>)/); // Split by closing paragraph tags
    
    // Define insertion points (indices in the contentParts array)
    // These are approximate placements after a certain number of paragraphs
    const adSlotIndices = {
      slot1: 6,  // Approx after 3 paragraphs
      slot2: 14, // Approx after 7 paragraphs
      slot3: 22, // Approx after 11 paragraphs
    };

    contentParts.forEach((part, index) => {
      contentWithAds.push(part);

      // Ad Slot 1: Shown for low, medium, high density
      if (index === adSlotIndices.slot1 && (adDensity === 'low' || adDensity === 'medium' || adDensity === 'high')) {
        contentWithAds.push(<AdPlaceholder key="ad-incontent-1" type="in-content" className="my-8" />);
      }

      // Ad Slot 2: Shown for medium, high density
      if (index === adSlotIndices.slot2 && (adDensity === 'medium' || adDensity === 'high')) {
        contentWithAds.push(<AdPlaceholder key="ad-incontent-2" type="in-content" className="my-8" />);
      }

      // Ad Slot 3: Shown for high density
      if (index === adSlotIndices.slot3 && adDensity === 'high') {
        contentWithAds.push(<AdPlaceholder key="ad-incontent-3" type="in-content" className="my-8" />);
      }
    });

    return contentWithAds.map((item, i) => 
        typeof item === 'string' ? <span key={i} dangerouslySetInnerHTML={{ __html: item }}/> : item
    );
  };
  

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8 px-4 animate-fade-in">
      <main className="flex-1 w-full lg:max-w-3xl xl:max-w-4xl">
        <AdPlaceholder type="leaderboard-header" className="mb-6" />
        <article>
          {blog.coverImageUrl && (
            <div className="relative w-full h-72 sm:h-96 rounded-lg overflow-hidden mb-8 shadow-lg">
              <Image
                src={blog.coverImageUrl}
                alt={blog.title}
                layout="fill"
                objectFit="cover"
                priority 
                data-ai-hint="blog hero"
              />
            </div>
          )}

          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground mb-4 leading-tight">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center text-muted-foreground text-sm gap-x-4 gap-y-2">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={blog.authorPhotoURL || authorProfile?.photoURL || undefined} alt={blog.authorDisplayName || 'author'} />
                  <AvatarFallback>
                    {blog.authorDisplayName ? blog.authorDisplayName.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <Link href={`/profile/${blog.authorId}`} className="hover:underline">
                  By {blog.authorDisplayName || 'Anonymous'}
                </Link>
              </div>
              <span>{formattedDate}</span>
              <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-primary" /> {blog.readingTime} min read</span>
              <span className="flex items-center"><Eye className="h-4 w-4 mr-1 text-primary" /> {blog.views} views</span>
              <span className="flex items-center font-semibold"><Coins className="h-4 w-4 mr-1 text-yellow-500" /> ${earnings}</span>
            </div>
          </header>

          {user && user.uid === blog.authorId && (
            <div className="mb-6 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/blog/edit/${blog.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex items-center" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your blog post.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Yes, delete it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          
          <div className="prose dark:prose-invert max-w-none">
             {renderContentWithAds()}
          </div>

          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          <SocialShareButtons blogTitle={blog.title} blogUrl={`/blog/${blog.slug}`} />
          
          <AdPlaceholder type="below-content" className="my-10" />
          
          <RelatedPosts currentBlogId={blog.id} tags={blog.tags} />
          <CommentsSection blogId={blog.id} />
        </article>
      </main>

      <aside className="w-full lg:w-1/4 lg:max-w-xs xl:max-w-sm hidden lg:block space-y-6">
        <div className="sticky top-20 space-y-6"> 
            <h3 className="text-xl font-headline font-semibold text-foreground">Author</h3>
            {authorProfile ? (
                <div className="p-4 bg-card rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={authorProfile.photoURL || undefined} alt={authorProfile.displayName || 'author'} />
                            <AvatarFallback>
                                {authorProfile.displayName ? authorProfile.displayName.charAt(0).toUpperCase() : <UserCircle />}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-card-foreground">{authorProfile.displayName}</p>
                            <p className="text-xs text-muted-foreground">{authorProfile.email}</p>
                        </div>
                    </div>
                    {authorProfile.bio && <p className="text-sm text-muted-foreground mb-3">{authorProfile.bio}</p>}
                     <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/profile/${blog.authorId}`}>View Profile</Link>
                    </Button>
                </div>
            ) : (
                 <div className="p-4 bg-card rounded-lg shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={blog.authorPhotoURL || undefined} alt={blog.authorDisplayName || 'author'} />
                            <AvatarFallback>
                                {blog.authorDisplayName ? blog.authorDisplayName.charAt(0).toUpperCase() : <UserCircle />}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-card-foreground">{blog.authorDisplayName || "Anonymous"}</p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/profile/${blog.authorId}`}>View Profile</Link>
                    </Button>
                </div>
            )}
            <AdPlaceholder type="sidebar" />
        </div>
      </aside>
    </div>
  );
}

    