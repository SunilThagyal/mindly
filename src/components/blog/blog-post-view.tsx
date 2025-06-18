
"use client";

import type { Blog, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Clock, UserCircle, Edit, Trash2, Coins, Loader2 } from 'lucide-react';
import { VIRTUAL_CURRENCY_RATE_PER_VIEW } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
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


interface BlogPostViewProps {
  blog: Blog;
  authorProfile?: UserProfile | null; // Optional author profile for more details
}

export default function BlogPostView({ blog, authorProfile }: BlogPostViewProps) {
  const { user } = useAuth();
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

  return (
    <article className="max-w-3xl mx-auto py-8 animate-fade-in">
      {blog.coverImageUrl && (
        <div className="relative w-full h-72 sm:h-96 rounded-lg overflow-hidden mb-8 shadow-lg">
          <Image
            src={blog.coverImageUrl}
            alt={blog.title}
            layout="fill"
            objectFit="cover"
            priority // Added priority for LCP
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
            <span>By {blog.authorDisplayName || 'Anonymous'}</span>
          </div>
          <span>{formattedDate}</span>
          <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-primary" /> {blog.readingTime} min read</span>
          <span className="flex items-center"><Eye className="h-4 w-4 mr-1 text-primary" /> {blog.views} views</span>
          <span className="flex items-semibold"><Coins className="h-4 w-4 mr-1 text-yellow-500" /> ${earnings}</span>
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
      
      {/* Use a safer method if content can be arbitrary HTML */}
      <div
        className="prose prose-lg dark:prose-invert max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br />') }} 
      />

      {blog.tags && blog.tags.length > 0 && (
        <footer className="mt-12 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Tags:</h3>
          <div className="flex flex-wrap gap-2">
            {blog.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm">{tag}</Badge>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}
