
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from './rich-text-editor'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/config/cloudinary'; 
import { suggestTags as suggestTagsAI } from '@/ai/flows/suggest-tags';
import { generateBlogPost as generateBlogPostAI } from '@/ai/flows/generate-blog-post';
import type { Blog } from '@/lib/types';
import { slugify, estimateReadingTime } from '@/lib/helpers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lightbulb, X, Sparkles, Info, UploadCloud } from 'lucide-react'; 
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import sanitizeHtml from 'sanitize-html';
import EditorHelpDialog from './editor-help-dialog';

interface BlogEditorProps {
  blogId?: string;
}

export default function BlogEditor({ blogId }: BlogEditorProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null); 
  const [coverMediaType, setCoverMediaType] = useState<'image' | 'video' | null>(null);
  
  const [aiBlogTopic, setAiBlogTopic] = useState('');
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBlog, setIsLoadingBlog] = useState(!!blogId);
  const [showEditorHelpDialog, setShowEditorHelpDialog] = useState(false);


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
            setKeywords(blogData.keywords || []);
            setCurrentStatus(blogData.status);
            setCoverImageUrl(blogData.coverImageUrl || null); 
            setCoverMediaType(blogData.coverMediaType || null);
            setMetaDescription(blogData.metaDescription || '');
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
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';
      const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image

      if (file.size > maxSize) { 
        toast({ title: 'File too large', description: `Please upload a ${fileType} smaller than ${maxSize / (1024*1024)}MB.`, variant: 'destructive'});
        return;
      }
      setCoverImageFile(file);
      setCoverMediaType(fileType);
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
      let plainTextContent = content;
      if (typeof DOMParser !== 'undefined') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          plainTextContent = doc.body.textContent || "";
      } else {
          plainTextContent = content.replace(/<[^>]+>/g, ' ');
      }

      const result = await suggestTagsAI({ blogContent: plainTextContent }); 
      if (result.tags && result.tags.length > 0) {
        const newTags = result.tags.filter(tag => !tags.includes(tag));
        const combinedTags = [...tags, ...newTags].slice(0,10); 
        setTags(combinedTags);
        if (newTags.length > 0) {
          toast({ title: 'Tags Suggested!', description: `${newTags.length} new tags suggested. Total tags: ${combinedTags.length}.`, variant: 'success' });
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
      if (result && typeof result.title === 'string') {
        setTitle(result.title);
        setMetaDescription(result.metaDescription || '');
        setKeywords(result.keywords || []);
        let contentGenerated = false;
        if (typeof result.htmlContent === 'string' && result.htmlContent.trim() !== '') {
          const sanitizedContent = sanitizeHtml(result.htmlContent, { 
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 
                'img', 'iframe', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption', 
                'video', 'source', 'div'
            ]),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              div: ['class', 'style', 'data-media-type'], 
              img: [ 'src', 'alt', 'title', 'width', 'height', 'style', 'data-align', 'class', 'aria-hidden', 'data-media-src', 'data-media-width', 'data-media-height', 'data-media-type' ], 
              iframe: [ 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title' ],
              video: [ 'src', 'controls', 'width', 'height', 'poster', 'type', 'autoplay', 'muted', 'loop', 'playsinline', 'class', 'aria-hidden', 'preload', 'data-media-src', 'data-media-width', 'data-media-height', 'data-media-type' ], 
              source: [ 'src', 'type' ],
              '*': [ 'style', 'class' ], 
              span: ['style', 'class'], 
              p: ['style', 'class'],
              ol: ['style', 'class'],
              ul: ['style', 'class'],
              li: ['style', 'class'],
              strong: ['style', 'class'],
              em: ['style', 'class'],
              u: ['style', 'class'],
              s: ['style', 'class'],
              a: ['href', 'name', 'target', 'style', 'class', 'rel'],
            },
            allowedStyles: {
              '*': {
                'font-size': [ /^\d+(?:px|em|rem|%)$/ ],
                'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
                'color': [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|1|0?\.\d+)\s*\)$/, /^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/, /^hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*(?:0|1|0?\.\d+)\s*\)$/],
                'background-color': [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|1|0?\.\d+)\s*\)$/, /^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/, /^hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*(?:0|1|0?\.\d+)\s*\)$/],
                'font-family': [/.*/], 
              },
              div: { 
                'aspect-ratio': [/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/, /^\d+(\.\d+)?$/]
              }
            },
            allowedSchemes: [ 'http', 'https', 'ftp', 'mailto', 'tel', 'data' ],
            allowedClasses: {
              '*': [ 
                'ql-*', 'media-container', 'video-container', 'iframe-container', 'media-item'
              ] 
            },
             selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ],
             exclusiveFilter: function(frame) {
                return frame.tag === 'script' || (frame.tag === 'style' && !frame.text.includes('/* Quill editor styles */') && !frame.text.includes('aspect-ratio'));
            }
          });
          setContent(sanitizedContent); 
          contentGenerated = true;
        } else {
          setContent(''); 
        }
        if (contentGenerated) {
          toast({ title: 'Blog Post Drafted by AI!', description: 'Title, content, and meta description have been generated. Please review and edit.', variant: 'success' });
        } else {
          toast({ title: 'Title Generated by AI', description: 'Only the title was generated. Content area has been cleared.', variant: 'default' });
        }
      } else {
        throw new Error('AI returned incomplete data or title was invalid.');
      }
    } catch (error: any) {
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
    
    let plainTextContentForValidation = content;
    if (typeof DOMParser !== 'undefined') { 
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        plainTextContentForValidation = doc.body.textContent || "";
    } else { 
        plainTextContentForValidation = content.replace(/<[^>]+>/g, ' ').trim();
    }

    if (!title.trim() || !plainTextContentForValidation.trim()) {
      toast({ title: 'Validation Error', description: 'Title and non-empty content are required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const newSaveStatus = attemptPublish ? 'published' : 'draft';
    setCurrentStatus(newSaveStatus); 

    let finalUploadedCoverImageUrl: string | null = coverImageUrl;
    let finalCoverMediaType: 'image' | 'video' | null = coverMediaType; 

    if (coverImageFile) {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset' || CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_upload_preset_name') {
        toast({ title: 'Cloudinary Not Configured', description: 'Cannot upload cover image. Please check environment variables and ensure NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is correctly set to your unsigned preset name.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      const resourceType = coverImageFile.type.startsWith('video/') ? 'video' : 'image';
      const formData = new FormData();
      formData.append('file', coverImageFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'blog_covers'); 
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          finalUploadedCoverImageUrl = data.secure_url;
          finalCoverMediaType = resourceType;
        } else {
          throw new Error(data.error?.message || 'Cloudinary cover media upload failed.');
        }
      } catch (error) {
        toast({ title: 'Cover Media Upload Error', description: (error as Error).message, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
    } else if (!finalUploadedCoverImageUrl && title.trim()) { 
        finalUploadedCoverImageUrl = `https://api.a0.dev/assets/image?text=${encodeURIComponent(title.trim().substring(0, 100))}`;
        finalCoverMediaType = 'image';
    }
    
    const blogDataPayload = {
      title: title.trim(),
      content: content, 
      slug: slugify(title.trim()),
      tags: tags,
      keywords: keywords,
      status: newSaveStatus,
      readingTime: estimateReadingTime(content),
      coverImageUrl: finalUploadedCoverImageUrl,
      coverMediaType: finalCoverMediaType,
      metaDescription: metaDescription.trim(),
    };

    try {
      if (blogId) {
        const blogDocRef = doc(db, 'blogs', blogId);
        const existingBlogSnap = await getDoc(blogDocRef);
        const existingBlogData = existingBlogSnap.data() as Blog | undefined;
        let newPublishedAt: Timestamp | null = existingBlogData?.publishedAt instanceof Timestamp ? existingBlogData.publishedAt : null;
        if (newSaveStatus === 'published' && (!existingBlogData || existingBlogData.status !== 'published' || !(existingBlogData.publishedAt instanceof Timestamp))) {
          newPublishedAt = serverTimestamp() as Timestamp;
        } else if (newSaveStatus === 'draft') {
          newPublishedAt = null; 
        }
        
        const updatePayload: Partial<Blog> = {
          ...blogDataPayload,
          publishedAt: newPublishedAt,
        };
        await updateDoc(blogDocRef, updatePayload);
        toast({ title: 'Blog Updated!', description: `Your blog post has been ${newSaveStatus === 'published' ? 'published' : 'saved as draft'}.`, variant: 'success' });
      } else {
        const newBlogData: Omit<Blog, 'id'> = {
          ...blogDataPayload,
          authorId: user.uid,
          authorDisplayName: userProfile.displayName || 'Anonymous',
          authorPhotoURL: userProfile.photoURL || null,
          views: 0,
          likes: 0, 
          likedBy: [], 
          createdAt: serverTimestamp() as Timestamp, 
          publishedAt: newSaveStatus === 'published' ? serverTimestamp() as Timestamp : null,
        };
        const newDocRef = await addDoc(collection(db, 'blogs'), newBlogData);
        toast({ title: 'Blog Created!', description: `Your blog post has been ${newSaveStatus === 'published' ? 'published' : 'saved as draft'}.`, variant: 'success' });
        router.push(newSaveStatus === 'published' ? `/blog/${blogDataPayload.slug}` : '/my-blogs');
        return; 
      }
      
      router.push(newSaveStatus === 'published' ? `/blog/${blogDataPayload.slug}` : '/my-blogs');

    } catch (error) {
      console.error("Error saving blog post:", error);
      toast({ title: 'Save Error', description: 'Failed to save blog post. Check console for details.', variant: 'destructive' });
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
    <>
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
              Provide a topic or a detailed prompt, and let AI draft your blog post, title, and SEO meta description.
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
          <Label htmlFor="metaDescription" className="text-lg">Meta Description (for SEO)</Label>
          <Textarea
            id="metaDescription"
            placeholder="A brief, compelling summary for search engines (150-160 characters recommended)."
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="text-sm"
            disabled={isSubmitting}
            maxLength={160}
          />
           <p className="text-xs text-muted-foreground text-right">{metaDescription.length} / 160</p>
        </div>


        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="content" className="text-lg">Content</Label>
            <Button variant="ghost" size="icon" onClick={() => setShowEditorHelpDialog(true)} title="Editor Help" className="h-6 w-6 text-muted-foreground hover:text-primary">
                <Info className="h-4 w-4" />
            </Button>
          </div>
           <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your amazing blog post here, or let AI generate it for you..."
          />
        </div>

        <div className="space-y-2">
            <Label htmlFor="coverImage" className="text-lg">Cover Media (Image, GIF, Video)</Label>
            <div className="flex items-center gap-2">
                <Input
                id="coverImage"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm"
                onChange={handleImageUpload}
                className="file:text-sm file:font-medium file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:px-3 file:py-1.5 hover:file:bg-primary/20 flex-1"
                disabled={isSubmitting}
                />
                 <UploadCloud className="h-5 w-5 text-muted-foreground" />
            </div>
            {coverImageUrl && (
              <div className="mt-2 relative w-full h-64 rounded-md overflow-hidden border bg-black">
                {coverMediaType === 'video' ? (
                  <video
                    src={coverImageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                    data-ai-hint="video preview"
                  />
                ) : (
                  <Image 
                      src={coverImageUrl} 
                      alt="Cover preview" 
                      layout="fill" 
                      objectFit="contain" 
                      data-ai-hint={coverImageUrl.includes('api.a0.dev') ? "generated banner" : "article cover preview"}
                  />
                )}
                 <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100 z-10"
                    onClick={() => { setCoverImageFile(null); setCoverImageUrl(null); setCoverMediaType(null); const fileInput = document.getElementById('coverImage') as HTMLInputElement; if(fileInput) fileInput.value = ''; }}
                    title="Remove cover image"
                    disabled={isSubmitting}
                >
                    <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
                If no media is uploaded, a relevant thumbnail will be auto-generated from the title upon saving. Max 10MB for images/GIFs, 50MB for videos.
            </p>
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
    <EditorHelpDialog isOpen={showEditorHelpDialog} onClose={() => setShowEditorHelpDialog(false)} />
    </>
  );
}
