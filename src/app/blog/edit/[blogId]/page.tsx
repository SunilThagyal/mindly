"use client";
import BlogEditor from '@/components/blog/blog-editor';
import { useParams } from 'next/navigation';
import type { Metadata } from 'next';

// Although this is a client component, we can export metadata from it.
// Next.js will handle this correctly during server rendering.
export const metadata: Metadata = {
  title: 'Edit Blog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditBlogPage() {
  const params = useParams();
  const blogId = typeof params.blogId === 'string' ? params.blogId : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      {blogId ? <BlogEditor blogId={blogId} /> : <p>Loading editor or invalid blog ID...</p>}
    </div>
  );
}
