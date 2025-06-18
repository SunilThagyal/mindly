
"use client";

import { useEffect, useState, useCallback } from 'react';
import BlogCard from '@/components/blog/blog-card';
import type { Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ExternalLink, RefreshCw, ListFilter, Flame, BookOpen, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';

const POSTS_PER_PAGE = 6;

interface FetchErrorState {
  message: string | null;
  indexLink: string | null;
}

async function getBlogs(
  orderByField: string,
  orderDirection: "asc" | "desc",
  postsLimit: number,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  tag?: string | null
): Promise<{ blogs: Blog[], newLastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const blogsCol = collection(db, 'blogs');
  let q;

  let conditions = [where('status', '==', 'published')];
  if (tag) {
    conditions.push(where('tags', 'array-contains', tag));
  }

  if (lastDoc) {
    q = query(
      blogsCol,
      ...conditions,
      orderBy(orderByField, orderDirection),
      startAfter(lastDoc),
      limit(postsLimit)
    );
  } else {
    q = query(
      blogsCol,
      ...conditions,
      orderBy(orderByField, orderDirection),
      limit(postsLimit)
    );
  }

  const snapshot = await getDocs(q);
  const blogsData = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      title: data.title || '',
      content: data.content || '',
      slug: data.slug || '',
      authorId: data.authorId || '',
      authorDisplayName: data.authorDisplayName || null,
      authorPhotoURL: data.authorPhotoURL || null,
      tags: data.tags || [],
      views: data.views || 0,
      readingTime: data.readingTime || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
      publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt : null,
      coverImageUrl: data.coverImageUrl || null,
    } as Blog;
  });
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { blogs: blogsData, newLastDoc };
}

async function getUniqueTagsSample(sampleLimit: number = 50): Promise<string[]> {
    const blogsCol = collection(db, 'blogs');
    // Order by publishedAt to get tags from more recent posts, potentially more relevant
    const q = query(blogsCol, where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(sampleLimit));
    const snapshot = await getDocs(q);
    const allTags: string[] = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
            allTags.push(...data.tags);
        }
    });
    // Get unique tags, sort them, and limit to 20 for the UI
    return [...new Set(allTags)].sort().slice(0, 20);
}


export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>("recent");

  const [recentPosts, setRecentPosts] = useState<Blog[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Blog[]>([]);
  const [mostReadPosts, setMostReadPosts] = useState<Blog[]>([]);
  const [explorePosts, setExplorePosts] = useState<Blog[]>([]);
  
  const [tagsForExplore, setTagsForExplore] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [lastDocRecent, setLastDocRecent] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDocTrending, setLastDocTrending] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDocMostRead, setLastDocMostRead] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDocExplore, setLastDocExplore] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingMostRead, setLoadingMostRead] = useState(false);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const [errorRecent, setErrorRecent] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorTrending, setErrorTrending] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorMostRead, setErrorMostRead] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorExplore, setErrorExplore] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorTags, setErrorTags] = useState<FetchErrorState>({ message: null, indexLink: null });

  const [hasMoreRecent, setHasMoreRecent] = useState(true);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [hasMoreMostRead, setHasMoreMostRead] = useState(true);
  const [hasMoreExplore, setHasMoreExplore] = useState(true);

  const handleFetchError = (error: any, setErrorState: React.Dispatch<React.SetStateAction<FetchErrorState>>, tabName: string) => {
    const errorMessage = error.message || `An unknown error occurred while fetching ${tabName} blogs.`;
    if (errorMessage.includes("firestore/failed-precondition") && errorMessage.includes("query requires an index")) {
      const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/);
      setErrorState({
        message: `Firestore needs a composite index for '${tabName}' blogs. Please check your browser's developer console for a link to create it. This is a common one-time setup step per query type.`,
        indexLink: urlMatch ? urlMatch[0] : null,
      });
    } else {
      setErrorState({ message: `Error fetching ${tabName} blogs. Please try again or check the console.`, indexLink: null });
    }
  };

  const fetchPosts = useCallback(async (
    tab: string,
    isLoadMore: boolean = false
  ) => {
    let setPosts, setLastDoc, setLoading, setError, orderByField, orderDir, currentPosts, currentLastDoc, setHasMore, currentTag = null;

    switch (tab) {
      case 'recent':
        setPosts = setRecentPosts; setLastDoc = setLastDocRecent; setLoading = setLoadingRecent; setError = setErrorRecent;
        orderByField = 'publishedAt'; orderDir = 'desc'; currentPosts = recentPosts; currentLastDoc = lastDocRecent; setHasMore = setHasMoreRecent;
        break;
      case 'trending':
        setPosts = setTrendingPosts; setLastDoc = setLastDocTrending; setLoading = setLoadingTrending; setError = setErrorTrending;
        orderByField = 'views'; orderDir = 'desc'; currentPosts = trendingPosts; currentLastDoc = lastDocTrending; setHasMore = setHasMoreTrending;
        break;
      case 'mostRead':
        setPosts = setMostReadPosts; setLastDoc = setLastDocMostRead; setLoading = setLoadingMostRead; setError = setErrorMostRead;
        orderByField = 'readingTime'; orderDir = 'desc'; currentPosts = mostReadPosts; currentLastDoc = lastDocMostRead; setHasMore = setHasMoreMostRead;
        break;
      case 'explore':
        if (!selectedTag && !isLoadMore) { 
             setExplorePosts([]); 
             setLastDocExplore(null);
             setHasMoreExplore(true); 
             setLoadingExplore(false);
             return;
        }
        if (!selectedTag && isLoadMore) return; 
        setPosts = setExplorePosts; setLastDoc = setLastDocExplore; setLoading = setLoadingExplore; setError = setErrorExplore;
        orderByField = 'publishedAt'; orderDir = 'desc'; currentPosts = explorePosts; currentLastDoc = lastDocExplore; setHasMore = setHasMoreExplore;
        currentTag = selectedTag;
        break;
      default: return;
    }

    setLoading(true);
    if (!isLoadMore) setError({ message: null, indexLink: null }); 

    try {
      const lastDocToUse = isLoadMore ? currentLastDoc : null;
      if (isLoadMore && !lastDocToUse && currentPosts.length > 0) { // No lastDoc means no more pages if already loaded some
          setHasMore(false);
          setLoading(false);
          return;
      }
      if(isLoadMore && !currentLastDoc && currentPosts.length === 0) { // Trying to load more but never loaded initial and no last doc
        setHasMore(false); // Should not happen if initial load worked
        setLoading(false);
        return;
      }


      const { blogs: newBlogs, newLastDoc } = await getBlogs(orderByField, orderDir as "asc" | "desc", POSTS_PER_PAGE, lastDocToUse, currentTag);
      
      setPosts(prev => isLoadMore ? [...prev, ...newBlogs] : newBlogs);
      setLastDoc(newLastDoc);
      setHasMore(newBlogs.length === POSTS_PER_PAGE);
    } catch (error: any) {
      handleFetchError(error, setError, tab);
    } finally {
      setLoading(false);
    }
  }, [recentPosts.length, trendingPosts.length, mostReadPosts.length, explorePosts.length, lastDocRecent, lastDocTrending, lastDocMostRead, lastDocExplore, selectedTag]);

  useEffect(() => {
    if (recentPosts.length === 0 && !loadingRecent && hasMoreRecent) fetchPosts('recent');
    
    const fetchInitialTags = async () => {
        setLoadingTags(true);
        setErrorTags({ message: null, indexLink: null });
        try {
            const tags = await getUniqueTagsSample();
            setTagsForExplore(tags);
        } catch (error: any) {
            handleFetchError(error, setErrorTags, 'explore tags');
        } finally {
            setLoadingTags(false);
        }
    };
    if (tagsForExplore.length === 0 && !loadingTags) fetchInitialTags();
  }, []); 

  useEffect(() => {
    if (activeTab === 'explore') {
        setExplorePosts([]);
        setLastDocExplore(null);
        setHasMoreExplore(true);
        setErrorExplore({ message: null, indexLink: null }); 
        if (selectedTag && !loadingExplore) { 
            fetchPosts('explore');
        }
    } else if (activeTab) {
        if (activeTab === 'recent' && recentPosts.length === 0 && !loadingRecent && hasMoreRecent) fetchPosts('recent');
        else if (activeTab === 'trending' && trendingPosts.length === 0 && !loadingTrending && hasMoreTrending) fetchPosts('trending');
        else if (activeTab === 'mostRead' && mostReadPosts.length === 0 && !loadingMostRead && hasMoreMostRead) fetchPosts('mostRead');
    }
  }, [activeTab, selectedTag, fetchPosts]);


  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value !== 'explore') {
        setSelectedTag(null); 
    }
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    if (activeTab !== 'explore') {
        setActiveTab('explore'); 
    }
  };
  
  const renderBlogList = (
    blogs: Blog[],
    isLoading: boolean,
    errorState: FetchErrorState,
    hasMorePosts: boolean,
    loadMoreFn: () => void,
    tabNameForRetry: string
  ) => {
    if (isLoading && blogs.length === 0) { 
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {Array(POSTS_PER_PAGE).fill(0).map((_, index) => (
            <div key={index} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex justify-between mt-1">
                <Skeleton className="h-4 w-[50px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (errorState.message) {
      return (
        <div className="mt-6 text-center p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Blogs</p>
          <p className="text-sm whitespace-pre-wrap mb-3">{errorState.message}</p>
          {errorState.indexLink ? (
            <>
              <p className="text-sm mb-2">
                To fix this, please **open your browser's developer console (usually F12)**.
                Find the error message from Firestore. It will contain a link.
              </p>
              <p className="text-sm mb-4">
                **CRITICAL: Click the link provided in that error message.** It will take you to the Firebase console to create the missing index.
                Then, click 'Create Index' in the Firebase console and wait a few minutes for it to build.
              </p>
              <Button
                variant="outline"
                onClick={() => window.open(errorState.indexLink!, "_blank")}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Firestore Index Link (if available)
              </Button>
              <p className="text-xs mt-3">The link above is an attempt to extract it from the error. The most reliable link is in your browser console.</p>
            </>
          ) : (
            <p className="text-xs mt-3">Please check your browser console for more details, or try again later.</p>
          )}
          <Button onClick={() => fetchPosts(tabNameForRetry)} variant="outline" className="mt-4">
             <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      );
    }
    
    if (blogs.length === 0 && !isLoading) {
      return (
          <div className="text-center text-muted-foreground py-10 text-lg min-h-[200px] flex flex-col justify-center items-center">
            <Search className="h-16 w-16 mb-4 opacity-50" />
            <p>{activeTab === 'explore' && !selectedTag ? "Select a category to explore stories." : "No blogs found here yet. Be the first to contribute!"}</p>
          </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 mt-6">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
        {hasMorePosts && (
          <div className="mt-8 text-center">
            <Button onClick={loadMoreFn} disabled={isLoading || !hasMorePosts} size="lg">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load More Posts"}
            </Button>
          </div>
        )}
         {!hasMorePosts && blogs.length > 0 && !isLoading && (
            <p className="text-center text-muted-foreground mt-8">You've reached the end!</p>
        )}
      </>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4 animate-fade-in">
          Explore the Blogosphere
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
          Discover recent articles, trending topics, most read stories, and explore by category.
        </p>
      </section>

      <Tabs defaultValue="recent" value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex justify-center mb-8">
            <TabsList className="flex flex-wrap justify-center gap-1 p-1 h-auto sm:grid sm:grid-cols-4 sm:max-w-2xl">
              <TabsTrigger value="recent" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><ListFilter />Recent</TabsTrigger>
              <TabsTrigger value="trending" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><Flame />Trending</TabsTrigger>
              <TabsTrigger value="mostRead" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><BookOpen />Most Read</TabsTrigger>
              <TabsTrigger value="explore" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><Search />Explore</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="recent" className="animate-fade-in">
          {renderBlogList(recentPosts, loadingRecent, errorRecent, hasMoreRecent, () => fetchPosts('recent', true), 'recent')}
        </TabsContent>
        <TabsContent value="trending" className="animate-fade-in">
          {renderBlogList(trendingPosts, loadingTrending, errorTrending, hasMoreTrending, () => fetchPosts('trending', true), 'trending')}
        </TabsContent>
        <TabsContent value="mostRead" className="animate-fade-in">
          {renderBlogList(mostReadPosts, loadingMostRead, errorMostRead, hasMoreMostRead, () => fetchPosts('mostRead', true), 'mostRead')}
        </TabsContent>
        <TabsContent value="explore" className="animate-fade-in">
          <div className="mb-6 p-4 bg-card rounded-lg shadow">
            <h3 className="text-xl font-headline font-semibold mb-4 text-foreground">Explore by Category</h3>
            {loadingTags && <Skeleton className="h-8 w-1/3 mb-2" />}
            {errorTags.message && <p className="text-destructive">{errorTags.message}</p>}
            
            {!loadingTags && tagsForExplore.length === 0 && !errorTags.message && (
                <p className="text-muted-foreground">No categories available to explore at the moment.</p>
            )}

            {!loadingTags && tagsForExplore.length > 0 && (
                <div className="flex flex-wrap gap-3">
                {tagsForExplore.map(tag => (
                    <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "secondary"}
                    onClick={() => handleTagSelect(tag)}
                    className="cursor-pointer text-sm px-4 py-1.5 hover:bg-primary/20 transition-colors duration-200"
                    >
                    {tag}
                    </Badge>
                ))}
                </div>
            )}
          </div>
          {selectedTag && <h4 className="text-2xl font-headline font-semibold mb-6 text-foreground">Showing posts for: <span className="text-primary">{selectedTag}</span></h4>}
          {renderBlogList(explorePosts, loadingExplore, errorExplore, hasMoreExplore, () => fetchPosts('explore', true), 'explore')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
