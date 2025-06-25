
"use client";

import type { Blog, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Clock, UserCircle, Edit, Trash2, Coins, Share2, Heart, Loader2, AlertTriangle } from 'lucide-react';
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
import { deleteDoc, doc, updateDoc, increment, arrayUnion, arrayRemove, runTransaction, serverTimestamp, addDoc, collection, FieldValue } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdPlaceholder from '@/components/layout/ad-placeholder';
import RelatedPosts from './related-posts';
import CommentsSection from './comments-section';
import SocialShareButtons from './social-share-buttons';
import { cn } from '@/lib/utils';
import { incrementViewCount } from '@/lib/actions';
import ReadingProgressBar from './reading-progress-bar';

interface BlogPostViewProps {
  blog: Blog;
  authorProfile?: UserProfile | null;
}

export default function BlogPostView({ blog: initialBlog, authorProfile }: BlogPostViewProps) {
  const { user, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const { adsEnabled, adDensity } = useAdSettings();
  const { baseEarningPerView, minimumViewDuration, loadingSettings: loadingEarnings } = useEarningsSettings();
  const router = useRouter();
  const { toast } = useToast();
  
  const [blog, setBlog] = useState<Blog>(initialBlog);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [processedContent, setProcessedContent] = useState<string | null>(null);
  const viewTriggered = useRef(false);
  const [isCoverLoaded, setIsCoverLoaded] = useState(false);

  useEffect(() => {
    // Ensure this effect runs only once per page load and all data is ready.
    if (viewTriggered.current || authLoading || loadingEarnings) {
      return;
    }
    
    viewTriggered.current = true; // Prevent this from ever running again on this page load

    // Don't count views for the author
    if (user?.uid === initialBlog.authorId) {
      return;
    }

    const viewedKey = `viewed-${initialBlog.id}`;
    if (sessionStorage.getItem(viewedKey)) {
      return;
    }
    
    const duration = (minimumViewDuration ?? 5) * 1000;

    const timer = setTimeout(() => {
      // Mark as viewed in session storage inside the timer to ensure user stayed
      sessionStorage.setItem(viewedKey, 'true');
      
      // Fire-and-forget server action
      incrementViewCount(initialBlog.id, initialBlog.authorId).then(result => {
        if (result.success) {
          // Optimistically update the view count on the client
          setBlog(prevBlog => ({...prevBlog, views: (prevBlog.views || 0) + 1}));
        }
      });
    }, duration);

    // Cleanup function to clear the timer if the component unmounts
    return () => clearTimeout(timer);

  }, [initialBlog.id, initialBlog.authorId, user, authLoading, loadingEarnings, minimumViewDuration]);


  const wrapMediaElements = useCallback((htmlContent: string) => {
    if (typeof window === 'undefined' || !htmlContent) return htmlContent;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const body = doc.body;

    const mediaSelectors = 'img, video, iframe';
    const mediaElements = Array.from(body.querySelectorAll(mediaSelectors));

    mediaElements.forEach(mediaEl => {
      if (mediaEl.closest('.media-container')) {
        return;
      }

      const container = doc.createElement('div');
      container.classList.add('media-container');

      const mediaType = mediaEl.tagName.toLowerCase();
      const mediaSrc = mediaEl.getAttribute('src') || '';

      if (mediaType === 'img') {
        container.style.setProperty('--bg-image', `url("${mediaSrc}")`);
      } else if (mediaType === 'video') {
        container.classList.add('video-container');
      } else if (mediaType === 'iframe') {
        container.classList.add('iframe-container');
      }

      const clonedMedia = mediaEl.cloneNode(true) as HTMLElement;
      clonedMedia.classList.add('media-item');

      if (clonedMedia instanceof HTMLImageElement) {
        clonedMedia.alt = mediaEl.getAttribute('alt') || 'Blog media';
      } else if (clonedMedia instanceof HTMLVideoElement) {
        clonedMedia.controls = true;
      } else if (clonedMedia instanceof HTMLIFrameElement) {
        clonedMedia.setAttribute('frameborder', '0');
        clonedMedia.setAttribute('allowfullscreen', 'true');
        clonedMedia.title = mediaEl.getAttribute('title') || "Embedded content";
      }

      container.appendChild(clonedMedia);
      mediaEl.parentNode?.replaceChild(container, mediaEl);
    });

    return body.innerHTML;
  }, []);

  useEffect(() => {
    setBlog(initialBlog);
    if (initialBlog.content) {
        const wrappedContent = wrapMediaElements(initialBlog.content);
        setProcessedContent(wrappedContent);
    } else {
        setProcessedContent('');
    }
  }, [initialBlog, wrapMediaElements]);

  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Draft - Not Published';

  const earnings = (blog.views * baseEarningPerView).toFixed(2);
  const currentLikes = blog.likes || 0;
  const isLikedByCurrentUser = user ? blog.likedBy?.includes(user.uid) : false;
  
  const canShowEarningsToAuthor = user && user.uid === blog.authorId && currentUserProfile?.isMonetizationApproved === true;
  const isGeneratedCover = blog.coverImageUrl?.includes('api.a0.dev');

  const handleDelete = async () => {
    if (!user || user.uid !== blog.authorId) {
      toast({ title: "Error", description: "You are not authorized to delete this blog.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "blogs", blog.id));
      toast({ title: "Success", description: "Blog post deleted successfully.", variant: 'success' });
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
      toast({ title: "Login Required", description: "Redirecting to login...", variant: "default", duration: 2000 });
      const currentPath = `/blog/${blog.slug}`;
      router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    const isActionLike = !blog.likedBy?.includes(user.uid);

    // Trigger animation only on "like"
    if (isActionLike) {
        setIsAnimatingLike(true);
        setTimeout(() => setIsAnimatingLike(false), 400); // Animation duration
    }

    // Optimistic UI update
    setBlog(prevBlog => ({
      ...prevBlog,
      likes: (prevBlog.likes || 0) + (isActionLike ? 1 : -1),
      likedBy: isActionLike
        ? [...(prevBlog.likedBy || []), user.uid]
        : (prevBlog.likedBy || []).filter(uid => uid !== user.uid),
    }));
    
    if (isLiking) return;
    setIsLiking(true);

    const blogRef = doc(db, "blogs", blog.id);

    try {
      await runTransaction(db, async (transaction) => {
        const blogDoc = await transaction.get(blogRef);
        if (!blogDoc.exists()) {
          throw "Document does not exist!";
        }
        
        const firestoreLikedBy = blogDoc.data().likedBy || [];
        let operationType: 'like' | 'unlike';

        if (initialBlog.likedBy?.includes(user.uid)) { 
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
      toast({ title: "Error", description: "Could not update like status. Reverting UI.", variant: "destructive" });
      setBlog(initialBlog); 
    } finally {
      setIsLiking(false);
    }
  };

  const renderContentWithAds = () => {
    if (processedContent === null) {
        return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!adsEnabled) {
      return [<div key="full-content" dangerouslySetInnerHTML={{ __html: processedContent }} />];
    }
    
    const contentParts = processedContent.split(/(<\/p>)/gi); 
    const renderedElements: JSX.Element[] = [];
  
    const adInsertionPoints = {
      point1: 6,
      point2: 14,
      point3: 22,
    };
  
    contentParts.forEach((part, index) => {
      if (typeof part === 'string' && part.trim() !== '') {
        renderedElements.push(
          <div key={`content-part-${index}-${Math.random()}`} dangerouslySetInnerHTML={{ __html: part }} />
        );
      }
  
      if (index === adInsertionPoints.point1 && (adDensity === 'low' || adDensity === 'medium' || adDensity === 'high')) {
        renderedElements.push(<AdPlaceholder key={`ad-incontent-1-${index}-${Math.random()}`} type="in-content" className="my-8" />);
      } else if (index === adInsertionPoints.point2 && (adDensity === 'medium' || adDensity === 'high')) {
        renderedElements.push(<AdPlaceholder key={`ad-incontent-2-${index}-${Math.random()}`} type="in-content" className="my-8" />);
      } else if (index === adInsertionPoints.point3 && adDensity === 'high') {
        renderedElements.push(<AdPlaceholder key={`ad-incontent-3-${index}-${Math.random()}`} type="in-content" className="my-8" />);
      }
    });
  
    if (renderedElements.length === 0 && processedContent && processedContent.trim() !== '') {
        return [<div key="full-content-fallback" dangerouslySetInnerHTML={{ __html: processedContent }} />];
    }
    
    return renderedElements;
  };
  
  // Helper function to create a plain text excerpt from HTML content
  const createExcerpt = (html: string, length: number = 120): string => {
    if (!html) return '';
    // A simple way to strip HTML tags for this purpose
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText.length <= length) {
      return plainText;
    }
    // Try to break at a word boundary
    const trimmed = plainText.substring(0, length);
    return trimmed.substring(0, Math.min(trimmed.length, trimmed.lastIndexOf(' '))) + '...';
  };
  
  const excerpt = createExcerpt(blog.content);

  if (blog.status === 'draft' && (!user || user?.uid !== blog.authorId)) {
     return <div className="text-center py-10">This blog post is currently a draft and not publicly visible.</div>;
  }

  return (
    <>
      <ReadingProgressBar />
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8 px-4 animate-fade-in">
        <main className="flex-1 w-full lg:max-w-3xl xl:max-w-4xl">
          <AdPlaceholder type="leaderboard-header" className="mb-6" />
          <article id="blog-article-content">
            <div id="reading-content-container">
              {blog.coverImageUrl && (
                <div className="relative w-full h-72 sm:h-96 rounded-lg overflow-hidden mb-8 shadow-lg bg-black">
                  {/* Background Blurred Image */}
                  <Image
                    src={blog.coverImageUrl}
                    alt="" // Decorative
                    layout="fill"
                    objectFit="cover"
                    className={cn(
                        "filter blur-xl scale-110 transition-opacity duration-500",
                        isCoverLoaded ? "opacity-70" : "opacity-0"
                    )}
                    aria-hidden="true"
                    priority
                  />
                  {/* Foreground Contained Image */}
                  <Image
                    src={blog.coverImageUrl}
                    alt={blog.title}
                    layout="fill"
                    objectFit="contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 896px"
                    className={cn(
                        "relative z-10 drop-shadow-lg transition-opacity duration-500",
                        isCoverLoaded ? "opacity-100" : "opacity-0"
                    )}
                    priority
                    onLoad={() => setIsCoverLoaded(true)}
                    data-ai-hint={isGeneratedCover ? "generated banner" : "blog hero"}
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
                  {canShowEarningsToAuthor && (
                    <span className="flex items-center font-semibold"><Coins className="h-4 w-4 mr-1 text-yellow-500" /> ${earnings}</span>
                  )}
                </div>
              </header>

              <div className="my-6 flex items-center gap-3 sm:gap-4">
                 <Button
                    onClick={handleLikePost}
                    disabled={isLiking}
                    variant="ghost"
                    className="group relative p-0 h-auto rounded-xl focus:outline-none focus:ring-2 ring-offset-background focus:ring-destructive"
                    aria-pressed={isLikedByCurrentUser}
                    title={isLikedByCurrentUser ? "Unlike post" : "Like post"}
                  >
                     <span className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 group-hover:scale-105",
                        isLikedByCurrentUser
                          ? "bg-destructive border-destructive text-destructive-foreground" 
                          : "border-muted-foreground/30 hover:border-destructive/50",
                        isLiking && "cursor-not-allowed"
                    )}>
                      {isLiking ? (
                         <Loader2 className="h-6 w-6 animate-spin text-current" />
                      ) : (
                        <>
                          <Heart className={cn(
                            "h-6 w-6 transition-all",
                            isLikedByCurrentUser && "fill-current",
                            isAnimatingLike && "animate-like-pop"
                          )} />
                          <span className="text-sm tabular-nums">
                            {currentLikes > 0 ? currentLikes : (isLikedByCurrentUser ? 'Liked' : 'Like')}
                          </span>
                        </>
                      )}
                    </span>
                  </Button>

                {user && user.uid === blog.authorId && (
                  <>
                    <Button
                      asChild
                      variant="default"
                      className={cn(
                        "px-4 py-2 rounded-xl font-semibold text-primary-foreground",
                        "bg-primary hover:bg-primary/90", 
                        "shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95",
                        "focus:outline-none focus:ring-2 ring-offset-2 ring-primary ring-offset-background"
                      )}
                    >
                      <Link href={`/blog/edit/${blog.id}`}>
                        <Edit className="h-5 w-5 mr-2" />
                        <span className="text-sm">Edit</span>
                      </Link>
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className={cn(
                            "px-4 py-2 rounded-xl font-semibold text-destructive-foreground",
                            "bg-destructive hover:bg-destructive/90", 
                            "shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95",
                            "focus:outline-none focus:ring-2 ring-offset-2 ring-destructive ring-offset-background",
                            isDeleting && "cursor-not-allowed opacity-70"
                          )}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5 mr-2" />
                          )}
                          <span className="text-sm">Delete</span>
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
                          <AlertDialogAction 
                            onClick={handleDelete} 
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Yes, delete it
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>

              <div 
                className="prose dark:prose-invert"
              >
                 {processedContent === null ? (
                    <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    renderContentWithAds()
                )}
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
            </div>

            <SocialShareButtons blogTitle={blog.title} blogUrl={`/blog/${blog.slug}`} blogExcerpt={excerpt} />

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
    </>
  );
}
