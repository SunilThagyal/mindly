
"use client";

import type { Blog, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Clock, UserCircle, Edit, Trash2, Coins, Share2, Heart, Loader2, Maximize, Play, Pause, Volume2, VolumeX } from 'lucide-react';
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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdPlaceholder from '@/components/layout/ad-placeholder';
import RelatedPosts from './related-posts';
import CommentsSection from './comments-section';
import SocialShareButtons from './social-share-buttons';
import { cn } from '@/lib/utils';
import { incrementViewCount } from '@/lib/actions';
import ReadingProgressBar from './reading-progress-bar';
import MediaLightbox from '@/components/media/media-lightbox';

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
  
  const articleContentRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [blog, setBlog] = useState<Blog>(initialBlog);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [processedContent, setProcessedContent] = useState<string | null>(null);
  const viewTriggered = useRef(false);
  const [isCoverLoaded, setIsCoverLoaded] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ src: string; type: 'image' | 'video' } | null>(null);

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

    const mediaSelectors = 'img, iframe'; // Look for img and iframe initially
    const mediaElements = Array.from(body.querySelectorAll(mediaSelectors));

    const maximizeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;

    mediaElements.forEach(mediaEl => {
        if (mediaEl.closest('.media-container')) return;

        const mediaSrc = mediaEl.getAttribute('src') || '';
        let finalMediaElement: HTMLElement;
        let finalMediaType: 'image' | 'video' | 'iframe' = 'iframe';
        
        // Detect if an iframe source is a direct video link and convert it to a video element
        if (mediaEl.tagName.toLowerCase() === 'iframe' && /\.(mp4|webm|ogg)$/i.test(mediaSrc)) {
            finalMediaType = 'video';
            const videoEl = doc.createElement('video');
            videoEl.src = mediaSrc;
            finalMediaElement = videoEl;
        } else if (mediaEl.tagName.toLowerCase() === 'img') {
            finalMediaType = 'image';
            finalMediaElement = mediaEl.cloneNode(true) as HTMLElement;
        }
        else {
             finalMediaElement = mediaEl.cloneNode(true) as HTMLElement;
        }


        const container = doc.createElement('div');
        container.classList.add('media-container', 'group/videocontainer');

        if (finalMediaType === 'image') {
            container.style.setProperty('--bg-image', `url("${mediaSrc}")`);
        } else if (finalMediaType === 'video') {
            container.classList.add('video-container');
            (finalMediaElement as HTMLVideoElement).playsInline = true;
        } else { // iframe
            container.classList.add('iframe-container');
        }

        finalMediaElement.classList.add('media-item');

        if (finalMediaType === 'image' || finalMediaType === 'video') {
            const button = doc.createElement('button');
            button.setAttribute('data-lightbox-button', 'true');
            button.setAttribute('title', 'View fullscreen');
            button.setAttribute('aria-label', 'View fullscreen');
            button.className = "absolute top-2 right-2 text-white bg-black/30 hover:bg-black/50 opacity-0 group-hover/videocontainer:opacity-100 transition-opacity z-30 h-10 w-10 flex items-center justify-center rounded-full";
            button.innerHTML = maximizeIconSvg;
            container.appendChild(button);
        }

        container.appendChild(finalMediaElement);
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

  useEffect(() => {
    const container = articleRef.current; // Observe the whole article
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const button = target.closest('[data-lightbox-button="true"]');
        if (button) {
            event.preventDefault();
            event.stopPropagation();
            const mediaContainer = button.closest('.media-container');
            if (mediaContainer) {
                const mediaItem = mediaContainer.querySelector('.media-item');
                if (mediaItem && (mediaItem instanceof HTMLImageElement || mediaItem instanceof HTMLVideoElement)) {
                    setLightboxMedia({
                        src: mediaItem.src,
                        type: mediaItem.tagName.toLowerCase() as 'image' | 'video'
                    });
                }
            }
        }
    };

    container.addEventListener('click', handleClick);

    return () => {
        if (container) {
            container.removeEventListener('click', handleClick);
        }
    };
  }, [processedContent]);

  // Effect to enhance all video players with custom controls
  useEffect(() => {
    const iconSvgs = {
        play: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
        pause: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`,
        volume: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
        mute: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>`
    };

    const enhanceVideoPlayer = (container: HTMLElement) => {
      if (container.dataset.videoEnhanced) return;

      const foregroundVideo = container.querySelector<HTMLVideoElement>('video.media-item');
      const backgroundVideo = container.querySelector<HTMLVideoElement>('video:not(.media-item)');

      if (!foregroundVideo) return; // Main video is required.

      // Remove native controls and set initial state
      foregroundVideo.removeAttribute('controls');
      if (backgroundVideo) backgroundVideo.removeAttribute('controls');
      foregroundVideo.muted = true;
      if (backgroundVideo) backgroundVideo.muted = true;
      
      container.querySelector('.video-controls-overlay')?.remove();

      const controlsOverlay = document.createElement('div');
      controlsOverlay.className = 'video-controls-overlay is-paused';

      const topControls = document.createElement('div');
      topControls.className = 'video-controls-top';

      const playPauseBtn = document.createElement('button');
      playPauseBtn.className = 'video-control-button';
      playPauseBtn.innerHTML = iconSvgs.play; // Start with play icon
      
      const muteBtn = document.createElement('button');
      muteBtn.className = 'video-control-button';
      muteBtn.innerHTML = iconSvgs.mute;

      const progressBarContainer = document.createElement('div');
      progressBarContainer.className = 'video-progress-bar-container';
      
      const progressBarFill = document.createElement('div');
      progressBarFill.className = 'video-progress-bar-fill';
      
      topControls.appendChild(playPauseBtn);
      topControls.appendChild(muteBtn);
      progressBarContainer.appendChild(progressBarFill);
      controlsOverlay.appendChild(topControls);
      controlsOverlay.appendChild(progressBarContainer);
      container.appendChild(controlsOverlay);

      const togglePlay = () => {
          if (foregroundVideo.paused) {
              foregroundVideo.play();
              backgroundVideo?.play();
          } else {
              foregroundVideo.pause();
              backgroundVideo?.pause();
          }
      };
      
      const updatePlayButton = () => {
          playPauseBtn.innerHTML = foregroundVideo.paused ? iconSvgs.play : iconSvgs.pause;
          controlsOverlay.classList.toggle('is-paused', foregroundVideo.paused);
      };

      const toggleMute = () => {
          // Only the foreground video gets unmuted. Background stays muted.
          foregroundVideo.muted = !foregroundVideo.muted;
      };

      const updateMuteButton = () => {
          muteBtn.innerHTML = foregroundVideo.muted ? iconSvgs.mute : iconSvgs.volume;
      };

      const updateProgress = () => {
          if (foregroundVideo.duration > 0) {
              const progress = (foregroundVideo.currentTime / foregroundVideo.duration) * 100;
              progressBarFill.style.width = `${progress}%`;
          }
      };

      const seek = (e: MouseEvent) => {
          const rect = progressBarContainer.getBoundingClientRect();
          const pos = (e.pageX - rect.left) / rect.width;
          const seekTime = pos * foregroundVideo.duration;
          foregroundVideo.currentTime = seekTime;
          if (backgroundVideo) backgroundVideo.currentTime = seekTime;
      };

      playPauseBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
      container.onclick = (e) => { 
          if (!(e.target as HTMLElement).closest('button, a, .video-progress-bar-container')) { 
              togglePlay(); 
          } 
      };
      muteBtn.onclick = (e) => { e.stopPropagation(); toggleMute(); };
      progressBarContainer.onclick = (e) => { e.stopPropagation(); seek(e); };
      
      foregroundVideo.onplay = updatePlayButton;
      foregroundVideo.onpause = updatePlayButton;
      foregroundVideo.onvolumechange = updateMuteButton;
      foregroundVideo.ontimeupdate = updateProgress;
      
      // Set initial button states once data is loaded
      foregroundVideo.onloadeddata = () => { 
          updateMuteButton(); 
          updatePlayButton(); 
          // Sometimes browsers autoplay muted videos, let's sync the background
          if (!foregroundVideo.paused && backgroundVideo) {
              backgroundVideo.play();
          }
      };
      
      // Also sync background if foreground is already playing (e.g., from an autoplay attribute)
      if (backgroundVideo && !foregroundVideo.paused) {
          backgroundVideo.play();
      }

      container.dataset.videoEnhanced = 'true';
    };
    
    const enhanceAllVideos = () => {
        const rootElement = articleRef.current;
        if (rootElement) {
           rootElement.querySelectorAll<HTMLElement>('.media-container.video-container').forEach(enhanceVideoPlayer);
        }
    };
    
    // The MutationObserver approach is more reliable than a simple timeout.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node instanceof HTMLElement) {
                        if (node.matches('.media-container.video-container')) {
                            enhanceVideoPlayer(node);
                        }
                        node.querySelectorAll<HTMLElement>('.media-container.video-container').forEach(enhanceVideoPlayer);
                    }
                });
            }
        }
    });

    const containerToObserve = articleRef.current;
    if (containerToObserve) {
        // Run once initially in case content is already there
        enhanceAllVideos(); 
        // Then observe for any dynamically added content
        observer.observe(containerToObserve, { childList: true, subtree: true });
    }

    return () => {
        if (containerToObserve) {
            observer.disconnect();
        }
    };
  }, [processedContent]);

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
  
  const createExcerpt = (html: string, length: number = 120): string => {
    if (!html) return '';
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText.length <= length) {
      return plainText;
    }
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
      {lightboxMedia && (
        <MediaLightbox
            src={lightboxMedia.src}
            type={lightboxMedia.type}
            onClose={() => setLightboxMedia(null)}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8 px-4 animate-fade-in">
        <main className="flex-1 w-full lg:max-w-3xl xl:max-w-4xl">
          <AdPlaceholder type="leaderboard-header" className="mb-6" />
          <article ref={articleRef} id="blog-article-content">
            <div id="reading-content-container">
              {blog.coverImageUrl && (
                <div className={cn(
                    "relative w-full h-72 sm:h-96 rounded-lg overflow-hidden mb-8 shadow-lg bg-black group/videocontainer media-container",
                    blog.coverMediaType === 'video' && 'video-container'
                )}>
                  {blog.coverMediaType === 'video' ? (
                     <>
                      {/* Background Blurred Video */}
                      <video
                        key={`${blog.id}-bg-video`}
                        src={blog.coverImageUrl}
                        loop muted playsInline
                        onLoadedData={() => setIsCoverLoaded(true)}
                        className={cn(
                          "absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 transition-opacity duration-500",
                          isCoverLoaded ? "opacity-70" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      {/* Foreground Contained Video */}
                      <video
                        key={`${blog.id}-fg-video`}
                        src={blog.coverImageUrl}
                        playsInline
                        loop
                        muted
                        className={cn(
                          "relative z-10 w-full h-full object-contain drop-shadow-lg transition-opacity duration-500 media-item",
                          isCoverLoaded ? "opacity-100" : "opacity-0"
                        )}
                        data-ai-hint="video cover"
                      />
                    </>
                  ) : (
                    <>
                      {/* Background Blurred Image */}
                      <Image
                        src={blog.coverImageUrl}
                        alt="" // Decorative
                        fill
                        style={{objectFit: 'cover'}}
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
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 896px"
                        style={{objectFit: 'contain'}}
                        className={cn(
                            "relative z-10 drop-shadow-lg transition-opacity duration-500 media-item",
                            isCoverLoaded ? "opacity-100" : "opacity-0"
                        )}
                        priority
                        onLoad={() => setIsCoverLoaded(true)}
                        data-ai-hint={isGeneratedCover ? "generated banner" : "blog hero"}
                      />
                    </>
                  )}
                  {isCoverLoaded && blog.coverImageUrl && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-white bg-black/30 hover:bg-black/50 opacity-0 group-hover/videocontainer:opacity-100 transition-opacity z-30 h-10 w-10 flex items-center justify-center rounded-full"
                        title="View fullscreen"
                        aria-label="View fullscreen"
                        data-lightbox-button="true"
                    >
                        <Maximize className="h-6 w-6" />
                    </Button>
                  )}
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
                ref={articleContentRef}
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
