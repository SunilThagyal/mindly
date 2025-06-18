
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from './rich-text-editor'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { suggestTags as suggestTagsAI } from '@/ai/flows/suggest-tags';
import { generateBlogPost as generateBlogPostAI } from '@/ai/flows/generate-blog-post';
import type { Blog } from '@/lib/types';
import { slugify, estimateReadingTime } from '@/lib/helpers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lightbulb, X, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import sanitizeHtml from 'sanitize-html';

interface BlogEditorProps {
  blogId?: string;
}

export default function BlogEditor({ blogId }: BlogEditorProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  
  const [aiBlogTopic, setAiBlogTopic] = useState('');
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [isLoadingBlog, setIsLoadingBlog] = useState(!!blogId);


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: 'Unauthorized', description: 'Please log in to create or edit a blog.', variant: 'destructive' });
      router.push('/auth/login');
      return;
    }

    if (blogId) {
      const fetchBlog = async () => {
        setIsLoadingBlog(true);
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
            setTags(blogData.tags || []);
            setCurrentStatus(blogData.status);
            setCoverImageUrl(blogData.coverImageUrl || null);
          } else {
            toast({ title: 'Not Found', description: 'Blog post not found.', variant: 'destructive' });
            router.push('/');
          }
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to load blog data.', variant: 'destructive' });
        } finally {
          setIsLoadingBlog(false);
        }
      };
      fetchBlog();
    }
  }, [blogId, user, authLoading, router, toast]);

  const handleTagInput = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentTag(e.target.value);
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 10) {
      setTags([...tags, currentTag.trim()]);
    } else if (tags.length >=10) {
      toast({ title: 'Tag limit reached', description: 'You can add a maximum of 10 tags.', variant: 'destructive' });
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
      setCoverImageUrl(URL.createObjectURL(file));
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
        const newTags = result.tags.filter(tag => !tags.includes(tag));
        const combinedTags = [...tags, ...newTags].slice(0,10); 
        setTags(combinedTags);
        if (newTags.length > 0) {
          toast({ title: 'Tags Suggested!', description: `${newTags.length} new tags suggested. Total tags: ${combinedTags.length}.` });
        } else {
          toast({ title: 'No new tags', description: 'AI could not suggest new tags, or suggestions already exist.' });
        }
        if (tags.length + newTags.length > 10) {
            toast({ title: 'Tag limit notice', description: 'Some suggested tags were omitted as the 10 tag limit was reached.', variant: 'default' });
        }
      } else {
        toast({ title: 'No new tags', description: 'AI could not suggest new tags based on the content.' });
      }
    } catch (error: any) {
      toast({ title: 'AI Error', description: error.message || 'Failed to suggest tags.', variant: 'destructive' });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handleGenerateBlogWithAI = async () => {
    if (!aiBlogTopic.trim()) {
      toast({ title: 'Topic Needed', description: 'Please provide a topic or prompt for the AI.', variant: 'destructive' });
      return;
    }
    setIsGeneratingBlog(true);
    try {
      const result = await generateBlogPostAI({ topic: aiBlogTopic });
      console.log("AI Generation Raw Result:", result);

      if (result && typeof result.title === 'string') {
        setTitle(result.title);
        let contentGenerated = false;

        if (typeof result.htmlContent === 'string' && result.htmlContent.trim() !== '') {
          const sanitizedContent = sanitizeHtml(result.htmlContent, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
              'img', 'video', 'iframe', 
              'span', 'div', 'br', 'hr',
              'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
              'figure', 'figcaption',
              'pre', 'code', // For code blocks
            ]),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              a: ['href', 'name', 'target', 'rel', 'title'],
              img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'style', 'class'],
              iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
              video: ['src', 'width', 'height', 'controls', 'autoplay', 'muted', 'loop', 'poster'],
              table: ['class', 'style', 'width', 'border', 'cellspacing', 'cellpadding', 'summary'],
              th: ['colspan', 'rowspan', 'scope', 'class', 'style'],
              td: ['colspan', 'rowspan', 'headers', 'class', 'style'],
              span: ['style', 'class'],
              div: ['style', 'class'],
              p: ['style', 'class'],
              pre: ['class', 'style'], // For code blocks
              code: ['class', 'style'], // For code blocks
              '*': ['style', 'class', 'id', 'title', 'lang', 'dir'],
            },
            allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'data'],
            allowedSchemesByTag: {
              img: ['data', 'http', 'https'],
            },
            // To better preserve pasted styles, allow more CSS properties if Quill is configured to handle them.
            // Be very careful with style sanitization.
            allowedStyles: {
              '*': {
                // General
                'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d\.]+\s*\)$/, /^hsl\(\s*\d+\s*,\s*[\d\.]*%\s*,\s*[\d\.]*%\s*\)$/, /^[a-z-]+$/],
                'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d\.]+\s*\)$/, /^hsl\(\s*\d+\s*,\s*[\d\.]*%\s*,\s*[\d\.]*%\s*\)$/, /^[a-z-]+$/, /^transparent$/],
                'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
                'font-size': [/^\d*\.?\d+(?:px|em|rem|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)?$/],
                'font-family': [/^[\s\w,-]+$/], // Allow common font families
                'font-weight': [/^(normal|bold|bolder|lighter|\d+)$/],
                'font-style': [/^(normal|italic|oblique)$/],
                'text-decoration': [/^(none|underline|overline|line-through|blink)$/],
                'line-height': [/^\d*\.?\d+(?:px|em|rem|%|pt)?$/ , /^[normal|inherit|initial|unset]+$/],
                'margin': [/^\s*auto\s*$|^(\s*(-?\d*\.?\d+(px|em|%|rem|pt|pc|in|cm|mm)\s*)){1,4}$/],
                'padding': [/^\s*auto\s*$|^(\s*(-?\d*\.?\d+(px|em|%|rem|pt|pc|in|cm|mm)\s*)){1,4}$/],
                'border': [/.*/], // Simplified for example, can be more specific
                'width': [/^\d*\.?\d+(?:px|em|%|rem|pt|pc|in|cm|mm|vw|vh)?$/, /^auto$/],
                'height': [/^\d*\.?\d+(?:px|em|%|rem|pt|pc|in|cm|mm|vw|vh)?$/, /^auto$/],
                'display': [/^inline$/, /^block$/, /^inline-block$/, /^flex$/, /^none$/, /^grid$/],
                'float': [/^left$/, /^right$/, /^none$/],
                'clear': [/^left$/, /^right$/, /^both$/, /^none$/],
                'list-style-type': [/.*/],
                // For code blocks from Quill
                'white-space': [/^(normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/],
              },
            },
            parseStyleAttributes: true, // Allow parsing of style attributes
            exclusiveFilter: function(frame) { // Remove empty <a> tags that some editors might produce
              return frame.tag === 'a' && !frame.text.trim() && !frame.children.length && (!frame.attribs.href || frame.attribs.href === '#');
            }
          });

          console.log("Sanitized AI Content to be set:", JSON.stringify(sanitizedContent));
          setContent(sanitizedContent); // This is what updates the 'value' prop of RichTextEditor
          contentGenerated = true;
        } else {
          console.warn("AI generated a title but htmlContent was empty, missing, or not a string. Received:", result.htmlContent);
          setContent(''); // Explicitly set to empty if AI returns no valid content
        }

        if (contentGenerated) {
          toast({ title: 'Blog Post Drafted by AI!', description: 'Title and content have been generated. Please review and edit.' });
        } else {
          toast({ title: 'Title Generated by AI', description: 'Only the title was generated. Content area has been cleared. Please write the content or try a more specific prompt.', variant: 'default' });
        }
      } else {
        console.error("AI result was incomplete or title was not a string:", result);
        throw new Error('AI returned incomplete data or title was invalid.');
      }
    } catch (error: any) {
      console.error("AI Generation Error in BlogEditor:", error);
      toast({ title: 'AI Generation Error', description: error.message || 'Failed to generate blog post.', variant: 'destructive' });
    } finally {
      setIsGeneratingBlog(false);
    }
  };

  const handleSubmit = async (attemptPublish: boolean) => {
    if (!user || !userProfile) {
      toast({ title: 'Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
     const plainTextContentForValidation = content.replace(/<[^>]+>/g, '').trim();
    if (!title.trim() || !plainTextContentForValidation) {
      toast({ title: 'Validation Error', description: 'Title and content are required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const newSaveStatus = attemptPublish ? 'published' : 'draft';
    setCurrentStatus(newSaveStatus); 

    let uploadedImageUrlPath: string | null = coverImageUrl; 
    if (coverImageFile) {
      const imageRef = ref(storage, `blog-covers/${user.uid}/${Date.now()}_${coverImageFile.name}`);
      try {
        const snapshot = await uploadBytes(imageRef, coverImageFile);
        uploadedImageUrlPath = await getDownloadURL(snapshot.ref);
      } catch (error) {
        toast({ title: 'Image Upload Error', description: 'Failed to upload cover image.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
    }
    
    const blogDataPayload = {
      title: title.trim(),
      content: content, 
      slug: slugify(title.trim()),
      tags: tags,
      status: newSaveStatus,
      readingTime: estimateReadingTime(content),
      coverImageUrl: uploadedImageUrlPath,
    };

    try {
      if (blogId) {
        const blogDocRef = doc(db, 'blogs', blogId);
        const existingBlogSnap = await getDoc(blogDocRef);
        const existingBlogData = existingBlogSnap.data() as Blog | undefined;

        let newPublishedAt: Timestamp | null = existingBlogData?.publishedAt instanceof Timestamp ? existingBlogData.publishedAt : null;

        if (newSaveStatus === 'published') {
          if (!existingBlogData || existingBlogData.status !== 'published' || !(existingBlogData.publishedAt instanceof Timestamp)) {
            newPublishedAt = serverTimestamp() as Timestamp;
          }
        } else { 
          newPublishedAt = null; 
        }
        
        const updatePayload: Partial<Blog> = {
          ...blogDataPayload,
          publishedAt: newPublishedAt,
          authorId: existingBlogData?.authorId, 
          authorDisplayName: existingBlogData?.authorDisplayName,
          authorPhotoURL: existingBlogData?.authorPhotoURL,
          createdAt: existingBlogData?.createdAt,
          views: existingBlogData?.views
        };


        await updateDoc(blogDocRef, updatePayload);
        toast({ title: 'Blog Updated!', description: `Your blog post has been ${newSaveStatus === 'published' ? 'published' : 'saved as draft'}.` });
      } else {
        const newBlogData: Omit<Blog, 'id'> = {
          ...blogDataPayload,
          authorId: user.uid,
          authorDisplayName: userProfile.displayName || 'Anonymous',
          authorPhotoURL: userProfile.photoURL || null,
          views: 0,
          createdAt: serverTimestamp() as Timestamp, 
          publishedAt: newSaveStatus === 'published' ? serverTimestamp() as Timestamp : null,
        };
        const newDocRef = await addDoc(collection(db, 'blogs'), newBlogData);
        toast({ title: 'Blog Created!', description: `Your blog post has been ${newSaveStatus === 'published' ? 'published' : 'saved as draft'}.` });
         if (newSaveStatus === 'published') router.push(`/blog/${blogDataPayload.slug}`); else router.push('/my-blogs');
         return; 
      }
      
      if (newSaveStatus === 'published') router.push(`/blog/${blogDataPayload.slug}`); else router.push('/my-blogs');

    } catch (error) {
      toast({ title: 'Save Error', description: 'Failed to save blog post.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !user) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (isLoadingBlog) {
     return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl animate-fade-in">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">{blogId ? 'Edit Blog Post' : 'Create New Blog Post'}</CardTitle>
        <CardDescription>Share your thoughts with the world. {blogId ? "Update your existing post." : "Craft a new masterpiece."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <Card className="bg-background/50 border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              AI Blog Generation
            </CardTitle>
            <CardDescription>
              Provide a topic or a detailed prompt, and let AI draft your blog post.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="aiBlogTopic">Topic / Prompt for AI</Label>
              <Textarea
                id="aiBlogTopic"
                placeholder="e.g., The future of renewable energy, or a detailed outline..."
                value={aiBlogTopic}
                onChange={(e) => setAiBlogTopic(e.target.value)}
                rows={3}
                disabled={isGeneratingBlog || isSubmitting}
                className="text-sm"
              />
            </div>
            <Button 
              type="button" 
              onClick={handleGenerateBlogWithAI} 
              variant="outline" 
              className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
              disabled={isGeneratingBlog || isSubmitting || !aiBlogTopic.trim()}
            >
              {isGeneratingBlog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              Generate with AI
            </Button>
          </CardContent>
        </Card>


        <div className="space-y-2">
          <Label htmlFor="title" className="text-lg">Title</Label>
          <Input
            id="title"
            placeholder="Your Awesome Blog Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg"
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-lg">Content</Label>
           <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your amazing blog post here, or let AI generate it for you..."
          />
        </div>

        <div className="space-y-2">
            <Label htmlFor="coverImage" className="text-lg">Cover Image (Optional)</Label>
            <Input
              id="coverImage"
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleImageUpload}
              className="file:text-sm file:font-medium file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:px-3 file:py-1.5 hover:file:bg-primary/20"
              disabled={isSubmitting}
            />
            {coverImageUrl && (
              <div className="mt-2 relative w-full h-64 rounded-md overflow-hidden border">
                <Image src={coverImageUrl} alt="Cover preview" layout="fill" objectFit="cover" data-ai-hint="article cover preview"/>
                 <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100"
                    onClick={() => { setCoverImageFile(null); setCoverImageUrl(null); const fileInput = document.getElementById('coverImage') as HTMLInputElement; if(fileInput) fileInput.value = ''; }}
                    title="Remove cover image"
                    disabled={isSubmitting}
                >
                    <X className="h-4 w-4" />
                </Button>
              </div>
            )}
        </div>


        <div className="space-y-2">
          <Label htmlFor="tags" className="text-lg">Tags (Max 10)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="tags"
              placeholder="Add a tag (e.g., tech, travel)"
              value={currentTag}
              onChange={handleTagInput}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag();}}}
              className="flex-grow"
              disabled={isSubmitting || tags.length >= 10}
              maxLength={25}
            />
            <Button type="button" onClick={addTag} variant="outline" size="sm" disabled={isSubmitting || tags.length >= 10 || !currentTag.trim()}>Add Tag</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                {tag}
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeTag(tag)} disabled={isSubmitting}>
                  <X className="h-3 w-3"/>
                  <span className="sr-only">Remove tag {tag}</span>
                </Button>
              </Badge>
            ))}
          </div>
          <Button type="button" onClick={handleSuggestTags} variant="outline" size="sm" disabled={isAISuggesting || isSubmitting || tags.length >= 10} className="mt-2">
            {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            Suggest Tags (AI)
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
        <Button onClick={() => handleSubmit(false)} variant="outline" disabled={isSubmitting || isGeneratingBlog}>
          {isSubmitting && currentStatus === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isGeneratingBlog}>
          {isSubmitting && currentStatus === 'published' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {blogId ? (currentStatus === 'published' ? 'Update Published Post' : 'Publish Now') : 'Publish Now'}
        </Button>
      </CardFooter>
    </Card>
  );
}

