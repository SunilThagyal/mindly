import BlogEditor from '@/components/blog/blog-editor';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create New Blog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateBlogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <BlogEditor />
    </div>
  );
}
