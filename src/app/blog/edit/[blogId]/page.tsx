"use client";
import BlogEditor from '@/components/blog/blog-editor';
import { useParams } from 'next/navigation';

export default function EditBlogPage() {
  const params = useParams();
  const blogId = typeof params.blogId === 'string' ? params.blogId : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      {blogId ? <BlogEditor blogId={blogId} /> : <p>Loading editor or invalid blog ID...</p>}
    </div>
  );
}
