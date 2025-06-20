
"use client";

import type { Blog, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Clock, UserCircle, Edit, Trash2, Coins, Share2, Heart } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAdSettings } from '@/context/ad-settings-context';
import { useEarningsSettings } from '@/context/earnings-settings-context';
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
import { deleteDoc, doc, updateDoc, increment, arrayUnion, arrayRemove, runTransaction, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AdPlaceholder from '@/components/layout/ad-placeholder';
import RelatedPosts from './related-posts';
import CommentsSection from './comments-section';
import SocialShareButtons from './social-share-buttons';
import { cn } from '@/lib/utils';

interface BlogPostViewProps {
  blog: Blog;
  authorProfile?: UserProfile | null;
}

export default function BlogPostView({ blog: initialBlog, authorProfile }: BlogPostViewProps) {
  const { user, userProfile: currentUserProfile } = useAuth();
  const { adDensity } = useAdSettings();
  const { baseEarningPerView } = useEarningsSettings();
  const router = useRouter();
  const { toast } = useToast();

  const [blog, setBlog] = useState<Blog>(initialBlog);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    setBlog(initialBlog);
  }, [initialBlog]);

  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Draft - Not Published';

  const earnings = (blog.views * baseEarningPerView).toFixed(2);
  const currentLikes = blog.likes || 0;
  const isLikedByCurrentUser = user ? blog.likedBy?.includes(user.uid) : false;

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

  const handleLikePost = async () => {
    if (!user || !currentUserProfile) {
      toast({ title: "Login Required", description: "Please log in to like a post.", variant: "destructive" });
      return;
    }
    if (isLiking) return;
    
    const alreadyLiked = blog.likedBy?.includes(user.uid);

    // Optimistic UI update
    setBlog(prevBlog => ({
      ...prevBlog,
      likes: (prevBlog.likes || 0) + (alreadyLiked ? -1 : 1),
      likedBy: alreadyLiked
        ? prevBlog.likedBy?.filter(uid => uid !== user.uid)
        : [...(prevBlog.likedBy || []), user.uid]
    }));
    
    setIsLiking(true); 

    const blogRef = doc(db, "blogs", blog.id);

    try {
      await runTransaction(db, async (transaction) => {
        const blogDoc = await transaction.get(blogRef);
        if (!blogDoc.exists()) {
          throw "Document does not exist!";
        }
        
        const currentFirestoreLikedBy = blogDoc.data().likedBy || [];
        let operationType: 'like' | 'unlike';

        if (currentFirestoreLikedBy.includes(user.uid)) { 
          transaction.update(blogRef, {
            likes: increment(-1),
            likedBy: arrayRemove(user.uid)
          });
          operationType = 'unlike';
        } else { 
          transaction.update(blogRef, {
            likes: increment(1),
            likedBy: arrayUnion(user.uid)
          });
          operationType = 'like';
        }
        
        if (operationType === 'like' && user.uid !== blog.authorId) {
          const notificationRef = collection(db, 'users', blog.authorId, 'notifications');
          await addDoc(notificationRef, { 
            type: 'new_post_like',
            blogId: blog.id,
            blogSlug: blog.slug,
            blogTitle: blog.title,
            likerName: currentUserProfile.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
            isRead: false,
            link: `/blog/${blog.slug}`,
          });
        }
      });
    } catch (error) {
      console.error("Error liking post:", error);
      toast({ title: "Error", description: "Could not update like status. Your view might be out of sync.", variant: "destructive" });
      setBlog(initialBlog); 
    } finally {
      setIsLiking(false);
    }
  };

  const renderContentWithAds = () => {
    let contentWithAds: (string | JSX.Element)[] = [];
    const contentParts = blog.content.split(/(<\/p>)/);

    const adSlotIndices = {
      slot1: 6,
      slot2: 14,
      slot3: 22,
    };

    contentParts.forEach((part, index) => {
      contentWithAds.push(part);
      if (index === adSlotIndices.slot1 && (adDensity === 'low' || adDensity === 'medium' || adDensity === 'high')) {
        contentWithAds.push(<AdPlaceholder key="ad-incontent-1" type="in-content" className="my-8" />);
      }
      if (index === adSlotIndices.slot2 && (adDensity === 'medium' || adDensity === 'high')) {
        contentWithAds.push(<AdPlaceholder key="ad-incontent-2" type="in-content" className="my-8" />);
      }
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

          <div className="my-6 flex items-center gap-4">
            <Button
              variant="ghost"
              size="default"
              onClick={handleLikePost}
              disabled={isLiking || !user}
              className="group transition-colors duration-200"
              aria-pressed={isLikedByCurrentUser}
              title={isLikedByCurrentUser ? "Unlike post" : "Like post"}
            >
              <Heart
                className={cn(
                  "mr-2 h-5 w-5 transition-transform duration-150 ease-in-out group-active:scale-125",
                  isLikedByCurrentUser 
                    ? "fill-red-500 text-red-500 group-hover:fill-red-600 group-hover:text-red-600" 
                    : "text-muted-foreground group-hover:text-red-500"
                )}
              />
              <span className={cn(
                isLikedByCurrentUser
                  ? "text-red-500 group-hover:text-red-600"
                  : "text-muted-foreground group-hover:text-red-500"
              )}>
                {currentLikes > 0 ? `${currentLikes}` : 'Like'}
              </span>
            </Button>
            {user && user.uid === blog.authorId && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/blog/edit/${blog.id}`} className="flex items-center">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex items-center" disabled={isDeleting}>
                      {isDeleting ? <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Trash2 className="mr-2 h-4 w-4" />} Delete
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
                        {isDeleting ? <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : null}
                        Yes, delete it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

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
          <CommentsSection
            blogId={blog.id}
            blogAuthorId={blog.authorId}
            blogTitle={blog.title}
            blogSlug={blog.slug}
          />
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
    

    

    