
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, orderBy, query, Timestamp, where } from 'firebase/firestore';
import type { Blog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, FileText, Trash2, Search, X, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PostTable from './post-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams, useRouter } from 'next/navigation';

async function fetchAllPosts(authorIdFilter?: string | null): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  let q;
  if (authorIdFilter) {
    q = query(blogsCol, where('authorId', '==', authorIdFilter), orderBy('createdAt', 'desc'));
  } else {
    q = query(blogsCol, orderBy('createdAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      title: data.title || '',
      content: data.content || '',
      slug: data.slug || '',
      authorId: data.authorId || '',
      authorDisplayName: data.authorDisplayName || 'Unknown',
      authorPhotoURL: data.authorPhotoURL || null,
      tags: data.tags || [],
      views: data.views || 0,
      readingTime: data.readingTime || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
      publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt : null,
      coverImageUrl: data.coverImageUrl || null,
      likes: data.likes || 0,
      likedBy: data.likedBy || [],
    } as Blog;
  });
}

export default function PostManagementTab() {
  const [allPosts, setAllPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Blog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const authorIdFromUrl = useMemo(() => searchParams.get('authorId'), [searchParams]);
  
  const [titleSearchTerm, setTitleSearchTerm] = useState('');
  const [authorNameSearchTerm, setAuthorNameSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');


  const fetchPostsData = useCallback(async (authorIdToFilterBy?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPosts = await fetchAllPosts(authorIdToFilterBy);
      setAllPosts(fetchedPosts);
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message || "Failed to load post data. Please try again.");
      toast({ title: 'Error', description: 'Failed to load posts.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPostsData(authorIdFromUrl);
  }, [authorIdFromUrl, fetchPostsData]);

  const handleDeleteRequest = (post: Blog) => {
    setPostToDelete(post);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'blogs', postToDelete.id));
      toast({ title: 'Post Deleted', description: `"${postToDelete.title}" has been deleted.` });
      setAllPosts(prevPosts => prevPosts.filter(p => p.id !== postToDelete.id));
    } catch (err: any)
{
      console.error("Error deleting post:", err);
      toast({ title: 'Delete Error', description: err.message || 'Failed to delete post.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    }
  };

  const filteredPosts = useMemo(() => {
    return allPosts.filter(post => {
      const matchesTitle = titleSearchTerm.trim() === '' ||
        post.title.toLowerCase().includes(titleSearchTerm.toLowerCase());
      const matchesAuthorName = authorNameSearchTerm.trim() === '' ||
        post.authorDisplayName?.toLowerCase().includes(authorNameSearchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      return matchesTitle && matchesAuthorName && matchesStatus;
    });
  }, [allPosts, titleSearchTerm, authorNameSearchTerm, statusFilter]);

  const clearAuthorFilter = () => {
    router.push('/admin?tab=posts', { scroll: false });
    // fetchPostsData(null) will be called by useEffect due to authorIdFromUrl change
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2" /> Post Management</CardTitle>
          <CardDescription>Loading post data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2" /> Post Management</CardTitle>
        </CardHeader>
        <CardContent className="text-center p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Posts</p>
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2" /> Post Management</CardTitle>
          <CardDescription>
            View, manage, and moderate all blog posts. 
            {authorIdFromUrl && ` Currently showing posts by a specific author. `}
            Found {filteredPosts.length} of {allPosts.length} posts matching filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center"><Filter className="mr-2 h-5 w-5" />Filters</h3>
                {authorIdFromUrl && (
                    <Button variant="outline" size="sm" onClick={clearAuthorFilter}>
                        <X className="mr-1 h-4 w-4" /> Clear Author Filter
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                <div>
                    <Label htmlFor="postTitleSearch">Search Post Title</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        id="postTitleSearch"
                        type="text"
                        placeholder="Search by title..."
                        value={titleSearchTerm}
                        onChange={(e) => setTitleSearchTerm(e.target.value)}
                        className="pl-8"
                        />
                        {titleSearchTerm && (
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setTitleSearchTerm('')}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div>
                    <Label htmlFor="postAuthorSearch">Search Author Name</Label>
                     <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        id="postAuthorSearch"
                        type="text"
                        placeholder="Search by author name..."
                        value={authorNameSearchTerm}
                        onChange={(e) => setAuthorNameSearchTerm(e.target.value)}
                        className="pl-8"
                        />
                        {authorNameSearchTerm && (
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setAuthorNameSearchTerm('')}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div>
                    <Label htmlFor="postStatusFilter">Filter by Status</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'published' | 'draft')}>
                        <SelectTrigger id="postStatusFilter">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-5">No posts match the current filters.</p>
          ) : (
            <PostTable posts={filteredPosts} onDeletePost={handleDeleteRequest} />
          )}
        </CardContent>
      </Card>

      {postToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the post
                <span className="font-semibold"> "{postToDelete.title}"</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePost}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Yes, delete post
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
