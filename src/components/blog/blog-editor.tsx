"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { suggestTags as suggestTagsAI } from '@/ai/flows/suggest-tags';
import type { Blog, BlogInput, UserProfile } from '@/lib/types';
import { slugify, estimateReadingTime } from '@/lib/helpers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, Lightbulb, X } from 'lucide-react';
import Image from 'next/image';

interface BlogEditorProps {
  blogId?: string; // For editing existing blog
}

export default function BlogEditor({ blogId }: BlogEditorProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: 'Unauthorized', description: 'Please log in to create a blog.', variant: 'destructive' });
      router.push('/auth/login');
      return;
    }

    if (blogId) {
      const fetchBlog = async () => {
        try {
          const blogDocRef = doc(db, 'blogs', blogId);
          const blogSnap = await getDoc(blogDocRef);
          if (blogSnap.exists()) {
            const blogData = blogSnap.data() as Blog;
            if (blogData.authorId !== user.uid) {
              toast({ title: 'Forbidden', description: 'You are not authorized to edit this blog.', variant: 'destructive' });
              router.push('/');
              return;
            }
            setTitle(blogData.title);
            setContent(blogData.content);
            setTags(blogData.tags);
            setStatus(blogData.status);
            setCoverImageUrl(blogData.coverImageUrl || null);
          } else {
            toast({ title: 'Not Found', description: 'Blog post not found.', variant: 'destructive' });
            router.push('/');
          }
        } catch (error) {
          console.error("Error fetching blog:", error);
          toast({ title: 'Error', description: 'Failed to load blog data.', variant: 'destructive' });
        }
      };
      fetchBlog();
    }
  }, [blogId, user, authLoading, router, toast]);

  const handleTagInput = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentTag(e.target.value);
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
    }
    setCurrentTag('');
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: 'Image too large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive'});
        return;
      }
      setCoverImageFile(file);
      setCoverImageUrl(URL.createObjectURL(file)); // Preview
    }
  };

  const handleSuggestTags = async () => {
    if (!content.trim()) {
      toast({ title: 'Content needed', description: 'Please write some content before suggesting tags.', variant: 'destructive' });
      return;
    }
    setIsAISuggesting(true);
    try {
      const result = await suggestTagsAI({ blogContent: content });
      if (result.tags && result.tags.length > 0) {
        setTags(prevTags => Array.from(new Set([...prevTags, ...result.tags]))); // Merge and deduplicate
        toast({ title: 'Tags Suggested!', description: `${result.tags.length} new tags suggested.` });
      } else {
        toast({ title: 'No new tags', description: 'AI could not suggest new tags based on the content.' });
      }
    } catch (error) {
      console.error("Error suggesting tags:", error);
      toast({ title: 'AI Error', description: 'Failed to suggest tags.', variant: 'destructive' });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handleSubmit = async (publish: boolean) => {
    if (!user || !userProfile) {
      toast({ title: 'Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Validation Error', description: 'Title and content are required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setStatus(publish ? 'published' : 'draft');

    let uploadedImageUrl = coverImageUrl; // Keep existing URL if not changed and editing
    if (blogId && !coverImageFile && coverImageUrl) { // Editing and image not changed
      uploadedImageUrl = coverImageUrl;
    } else if (coverImageFile) { // New image or changed image
      const imageRef = ref(storage, `blog-covers/${user.uid}/${Date.now()}_${coverImageFile.name}`);
      try {
        const snapshot = await uploadBytes(imageRef, coverImageFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({ title: 'Image Upload Error', description: 'Failed to upload cover image.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
    }


    const blogData: Omit<Blog, 'id' | 'createdAt' | 'publishedAt' | 'views' | 'authorPhotoURL' | 'authorDisplayName'> & { createdAt: any, publishedAt?: any } = {
      title,
      content,
      slug: slugify(title), // Regenerate slug in case title changed
      authorId: user.uid,
      tags,
      status: publish ? 'published' : 'draft',
      readingTime: estimateReadingTime(content),
      coverImageUrl: uploadedImageUrl || undefined,
      // these fields are specific to Blog type, not BlogInput
      // views will be initialized to 0 for new blogs
    };

    try {
      if (blogId) { // Update existing blog
        const blogDocRef = doc(db, 'blogs', blogId);
        const updatePayload: Partial<Blog> = {
          ...blogData,
          publishedAt: publish && !(await getDoc(blogDocRef)).data()?.publishedAt ? serverTimestamp() : (await getDoc(blogDocRef)).data()?.publishedAt || null,
        };
        await updateDoc(blogDocRef, updatePayload);
        toast({ title: 'Blog Updated!', description: `Your blog post has been ${publish ? 'published' : 'saved as draft'}.` });
      } else { // Create new blog
        const finalBlogData = {
          ...blogData,
          authorDisplayName: userProfile.displayName,
          authorPhotoURL: userProfile.photoURL || undefined,
          views: 0,
          createdAt: serverTimestamp(),
          publishedAt: publish ? serverTimestamp() : null,
        };
        const docRef = await addDoc(collection(db, 'blogs'), finalBlogData);
        toast({ title: 'Blog Created!', description: `Your blog post has been ${publish ? 'published' : 'saved as draft'}.` });
        router.push(`/blog/${finalBlogData.slug}`);
      }
      if (publish) router.push(`/blog/${blogData.slug}`); else router.push('/my-blogs');

    } catch (error) {
      console.error("Error saving blog:", error);
      toast({ title: 'Save Error', description: 'Failed to save blog post.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl animate-fade-in">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">{blogId ? 'Edit Blog Post' : 'Create New Blog Post'}</CardTitle>
        <CardDescription>Share your thoughts with the world. {blogId ? "Update your existing post." : "Craft a new masterpiece."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-lg">Title</Label>
          <Input
            id="title"
            placeholder="Your Awesome Blog Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-lg">Content</Label>
          <Textarea
            id="content"
            placeholder="Start writing your amazing blog post here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="text-base leading-relaxed"
          />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="coverImage" className="text-lg">Cover Image</Label>
            <Input 
              id="coverImage" 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="file:text-sm file:font-medium file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:px-3 file:py-1.5 hover:file:bg-primary/20"
            />
            {coverImageUrl && (
              <div className="mt-2 relative w-full h-64 rounded-md overflow-hidden border">
                <Image src={coverImageUrl} alt="Cover preview" layout="fill" objectFit="cover" />
              </div>
            )}
        </div>


        <div className="space-y-2">
          <Label htmlFor="tags" className="text-lg">Tags</Label>
          <div className="flex items-center gap-2">
            <Input
              id="tags"
              placeholder="Add a tag (e.g., tech, travel)"
              value={currentTag}
              onChange={handleTagInput}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag();}}}
              className="flex-grow"
            />
            <Button type="button" onClick={addTag} variant="outline" size="sm">Add Tag</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                {tag}
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3"/>
                  <span className="sr-only">Remove tag {tag}</span>
                </Button>
              </Badge>
            ))}
          </div>
          <Button type="button" onClick={handleSuggestTags} variant="outline" size="sm" disabled={isAISuggesting} className="mt-2">
            {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            Suggest Tags (AI)
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
        <Button onClick={() => handleSubmit(false)} variant="outline" disabled={isSubmitting}>
          {isSubmitting && status === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
          {isSubmitting && status === 'published' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {blogId ? 'Update & Publish' : 'Publish'}
        </Button>
      </CardFooter>
    </Card>
  );
}
