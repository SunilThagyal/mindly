
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import BlogCard from '@/components/blog/blog-card';
import type { Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ExternalLink, RefreshCw, ListFilter, Flame, BookOpen, Search as SearchIcon, Loader2 } from 'lucide-react'; // Renamed Search to SearchIcon
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useThemeSettings } from '@/context/theme-settings-context';
import { siteConfig } from '@/config/site';

const POSTS_PER_PAGE_DEFAULT = 9;
const TAG_SAMPLE_LIMIT = 100; // Fetch more posts to get a better sample for top tags
const DISPLAY_TAG_COUNT = 10;

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
      keywords: data.keywords || [],
      views: data.views || 0,
      readingTime: data.readingTime || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
      publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt : null,
      coverImageUrl: data.coverImageUrl || null,
      coverMediaType: data.coverMediaType || null,
      metaDescription: data.metaDescription || null,
      likes: data.likes || 0,
      likedBy: data.likedBy || [],
    } as Blog;
  });
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { blogs: blogsData, newLastDoc };
}

async function getTopUsedTagsFromSample(sampleLimit: number = TAG_SAMPLE_LIMIT): Promise<{ allUniqueTags: string[], topTags: string[] }> {
    const blogsCol = collection(db, 'blogs');
    const q = query(blogsCol, where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(sampleLimit));
    const snapshot = await getDocs(q);
    
    const tagCounts: Record<string, number> = {};
    const allUniqueTagsSet = new Set<string>();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
            data.tags.forEach((tag: string) => {
                if(typeof tag === 'string' && tag.trim() !== '') {
                    const cleanTag = tag.trim();
                    allUniqueTagsSet.add(cleanTag);
                    tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                }
            });
        }
    });

    const sortedByFrequency = Object.entries(tagCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([tag]) => tag);
    
    return { 
        allUniqueTags: Array.from(allUniqueTagsSet).sort(), 
        topTags: sortedByFrequency.slice(0, DISPLAY_TAG_COUNT) 
    };
}


export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>("recent");
  const { settings: themeSettings, loading: loadingTheme } = useThemeSettings();
  const postsPerPage = themeSettings?.itemsPerPage || POSTS_PER_PAGE_DEFAULT;


  const [recentPosts, setRecentPosts] = useState<Blog[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Blog[]>([]);
  const [mostReadPosts, setMostReadPosts] = useState<Blog[]>([]);
  
  const [allSampledTags, setAllSampledTags] = useState<string[]>([]);
  const [topDisplayTags, setTopDisplayTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [filteredSearchTags, setFilteredSearchTags] = useState<string[]>([]);


  const [lastDocRecent, setLastDocRecent] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDocTrending, setLastDocTrending] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDocMostRead, setLastDocMostRead] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const lastDocRecentRef = useRef(lastDocRecent);
  const lastDocTrendingRef = useRef(lastDocTrending);
  const lastDocMostReadRef = useRef(lastDocMostRead);

  useEffect(() => { lastDocRecentRef.current = lastDocRecent; }, [lastDocRecent]);
  useEffect(() => { lastDocTrendingRef.current = lastDocTrending; }, [lastDocTrending]);
  useEffect(() => { lastDocMostReadRef.current = lastDocMostRead; }, [lastDocMostRead]);

  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingMostRead, setLoadingMostRead] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const [errorRecent, setErrorRecent] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorTrending, setErrorTrending] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorMostRead, setErrorMostRead] = useState<FetchErrorState>({ message: null, indexLink: null });
  const [errorTags, setErrorTags] = useState<FetchErrorState>({ message: null, indexLink: null });

  const [hasMoreRecent, setHasMoreRecent] = useState(true);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [hasMoreMostRead, setHasMoreMostRead] = useState(true);

  const handleFetchError = (error: any, setErrorState: React.Dispatch<React.SetStateAction<FetchErrorState>>, tabName: string) => {
    const errorMessage = error.message || `An unknown error occurred while fetching ${tabName} blogs.`;
    if (errorMessage.includes("firestore/failed-precondition") && errorMessage.includes("query requires an index")) {
      const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/);
      setErrorState({
        message: `Firestore needs a composite index for '${tabName}' blogs. This is a common one-time setup. **CRITICAL: Open your browser's developer console (F12), find the Firestore error message, and click the link provided there to create the index.** It will take a few minutes to build.`,
        indexLink: urlMatch ? urlMatch[0] : null,
      });
    } else {
      setErrorState({ message: `Error fetching ${tabName} blogs. Please try again or check the console.`, indexLink: null });
    }
    console.error(`Error fetching ${tabName}:`, error);
  };

  const fetchPosts = useCallback(async (
    tabKey: string,
    isLoadMoreOperation: boolean = false
  ) => {
    let setPostsFunc: React.Dispatch<React.SetStateAction<Blog[]>>, 
        setLastDocFunc: React.Dispatch<React.SetStateAction<QueryDocumentSnapshot<DocumentData> | null>>, 
        setLoadingFunc: React.Dispatch<React.SetStateAction<boolean>>, 
        setErrorFunc: React.Dispatch<React.SetStateAction<FetchErrorState>>, 
        setHasMoreFunc: React.Dispatch<React.SetStateAction<boolean>>;
    let fieldToOrderBy: string;
    let sortDirection: "asc" | "desc";
    let lastDocForQuery: QueryDocumentSnapshot<DocumentData> | null = null;

    switch (tabKey) {
      case 'recent':
        setPostsFunc = setRecentPosts; setLastDocFunc = setLastDocRecent; setLoadingFunc = setLoadingRecent; setErrorFunc = setErrorRecent;
        fieldToOrderBy = 'publishedAt'; sortDirection = 'desc'; setHasMoreFunc = setHasMoreRecent;
        lastDocForQuery = lastDocRecentRef.current;
        break;
      case 'trending':
        setPostsFunc = setTrendingPosts; setLastDocFunc = setLastDocTrending; setLoadingFunc = setLoadingTrending; setErrorFunc = setErrorTrending;
        fieldToOrderBy = 'views'; sortDirection = 'desc'; setHasMoreFunc = setHasMoreTrending;
        lastDocForQuery = lastDocTrendingRef.current;
        break;
      case 'mostRead':
        setPostsFunc = setMostReadPosts; setLastDocFunc = setLastDocMostRead; setLoadingFunc = setLoadingMostRead; setErrorFunc = setErrorMostRead;
        fieldToOrderBy = 'readingTime'; sortDirection = 'desc'; setHasMoreFunc = setHasMoreMostRead;
        lastDocForQuery = lastDocMostReadRef.current;
        break;
      default: return;
    }

    setLoadingFunc(true);
    if (!isLoadMoreOperation) {
        setErrorFunc({ message: null, indexLink: null });
        setPostsFunc([]); 
        setLastDocFunc(null);
        setHasMoreFunc(true);
    }

    try {
      const lastDocToQueryWith = isLoadMoreOperation ? lastDocForQuery : null;
      const { blogs: newBlogs, newLastDoc: newCursor } = await getBlogs(fieldToOrderBy, sortDirection, postsPerPage, lastDocToQueryWith, null);
      
      setPostsFunc(prev => isLoadMoreOperation ? [...prev, ...newBlogs] : newBlogs);
      setLastDocFunc(newCursor);
      setHasMoreFunc(newBlogs.length === postsPerPage);

    } catch (error: any) {
      handleFetchError(error, setErrorFunc, tabKey);
      setHasMoreFunc(false);
    } finally {
      setLoadingFunc(false);
    }
  }, [postsPerPage]);

  useEffect(() => {
    if (loadingTheme) return; // Wait for theme settings to load
    if (recentPosts.length === 0 && !loadingRecent && hasMoreRecent) {
        fetchPosts('recent');
    }
    
    const fetchInitialTagsData = async () => {
        setLoadingTags(true);
        setErrorTags({ message: null, indexLink: null });
        try {
            const { allUniqueTags, topTags } = await getTopUsedTagsFromSample(TAG_SAMPLE_LIMIT);
            setAllSampledTags(allUniqueTags);
            setTopDisplayTags(topTags);
        } catch (error: any) {
            handleFetchError(error, setErrorTags, 'explore tags');
        } finally {
            setLoadingTags(false);
        }
    };
    if (allSampledTags.length === 0 && !loadingTags) {
        fetchInitialTagsData();
    }
  }, [loadingTheme, fetchPosts, recentPosts.length, hasMoreRecent, loadingRecent, allSampledTags.length, loadingTags]); 

  useEffect(() => {
    if (loadingTheme) return;
    if (activeTab === 'recent') {
      if (recentPosts.length === 0 && !loadingRecent && hasMoreRecent) fetchPosts('recent');
    } else if (activeTab === 'trending') {
      if (trendingPosts.length === 0 && !loadingTrending && hasMoreTrending) fetchPosts('trending');
    } else if (activeTab === 'mostRead') {
      if (mostReadPosts.length === 0 && !loadingMostRead && hasMoreMostRead) fetchPosts('mostRead');
    }
  }, [activeTab, loadingTheme, fetchPosts, hasMoreMostRead, hasMoreRecent, hasMoreTrending, loadingMostRead, loadingRecent, loadingTrending, mostReadPosts.length, recentPosts.length, trendingPosts.length]); 


  useEffect(() => {
    if (tagSearchQuery.trim() === '') {
      setFilteredSearchTags(topDisplayTags); 
    } else {
      setFilteredSearchTags(
        allSampledTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
      );
    }
  }, [tagSearchQuery, allSampledTags, topDisplayTags]);


  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const renderBlogList = (
    blogs: Blog[],
    isLoading: boolean,
    errorState: FetchErrorState,
    hasMorePostsState: boolean,
    loadMoreFn: () => void,
    tabNameForRetry: string
  ) => {
    if (isLoading && blogs.length === 0) { 
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {Array(postsPerPage).fill(0).map((_, index) => (
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
          {errorState.indexLink && (
             <p className="text-xs mt-3">If this is an index error, the link is usually found in the browser console log.</p>
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
            <SearchIcon className="h-16 w-16 mb-4 opacity-50" />
            <p>No blogs found here yet.</p>
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
        {hasMorePostsState && (
          <div className="mt-8 text-center">
            <Button onClick={loadMoreFn} disabled={isLoading || !hasMorePostsState} size="lg">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load More Posts"}
            </Button>
          </div>
        )}
         {!hasMorePostsState && blogs.length > 0 && !isLoading && (
            <p className="text-center text-muted-foreground mt-8">You've reached the end!</p>
        )}
      </>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4 animate-fade-in">
          Welcome to {siteConfig.name}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
          {siteConfig.description}
        </p>
      </section>

      <Tabs defaultValue="recent" value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex justify-center mb-8">
            <TabsList className="flex flex-wrap justify-center gap-1 p-1 h-auto sm:grid sm:grid-cols-4 sm:max-w-2xl">
              <TabsTrigger value="recent" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><ListFilter />Recent</TabsTrigger>
              <TabsTrigger value="trending" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><Flame />Trending</TabsTrigger>
              <TabsTrigger value="mostRead" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><BookOpen />Most Read</TabsTrigger>
              <TabsTrigger value="explore" className="flex items-center gap-2 py-2.5 text-sm sm:text-base"><SearchIcon />Explore</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="recent" className="animate-fade-in">
          <h2 className="sr-only">Recent Posts</h2>
          {renderBlogList(recentPosts, loadingRecent, errorRecent, hasMoreRecent, () => fetchPosts('recent', true), 'recent')}
        </TabsContent>
        <TabsContent value="trending" className="animate-fade-in">
          <h2 className="sr-only">Trending Posts</h2>
          {renderBlogList(trendingPosts, loadingTrending, errorTrending, hasMoreTrending, () => fetchPosts('trending', true), 'trending')}
        </TabsContent>
        <TabsContent value="mostRead" className="animate-fade-in">
          <h2 className="sr-only">Most Read Stories</h2>
          {renderBlogList(mostReadPosts, loadingMostRead, errorMostRead, hasMoreMostRead, () => fetchPosts('mostRead', true), 'mostRead')}
        </TabsContent>
        <TabsContent value="explore" className="animate-fade-in">
          <h2 className="sr-only">Explore Posts by Category</h2>
          <div className="mb-6 p-4 bg-card rounded-lg shadow">
            <h3 className="text-xl font-headline font-semibold mb-2 text-foreground">Explore by Category</h3>
             <Input 
                type="search"
                placeholder="Search categories..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="mb-4"
            />
            
            {loadingTags && <Skeleton className="h-8 w-1/3 mb-2" />}
            {errorTags.message && <p className="text-destructive text-sm">{errorTags.message}</p>}
            
            {!loadingTags && allSampledTags.length === 0 && !errorTags.message && (
                <p className="text-muted-foreground text-sm">No categories available to explore at the moment.</p>
            )}
            
            <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {tagSearchQuery ? `Search Results (${filteredSearchTags.length})` : `Top ${DISPLAY_TAG_COUNT} Categories`}
                </h4>
                {filteredSearchTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                    {filteredSearchTags.map(tag => (
                        <Link key={tag} href={`/tags/${encodeURIComponent(tag.toLowerCase())}`} passHref>
                           <Badge
                                variant={"secondary"}
                                className="cursor-pointer text-sm px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                                >
                                {tag}
                            </Badge>
                        </Link>
                    ))}
                    </div>
                ) : (
                    !loadingTags && <p className="text-sm text-muted-foreground">{tagSearchQuery ? "No categories match your search." : "No top categories found."}</p>
                )}
            </div>
          </div>
          <div className="text-center text-muted-foreground py-10 text-lg min-h-[200px] flex flex-col justify-center items-center">
            <SearchIcon className="h-16 w-16 mb-4 opacity-50" />
            <p>Select or search a category above to explore stories.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
