
"use client";

import type { Blog } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import PostTableRowActions from './post-table-row-actions';
import { format } from 'date-fns';

interface PostTableProps {
  posts: Blog[];
  onDeletePost: (post: Blog) => void;
}

export default function PostTable({ posts, onDeletePost }: PostTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[250px]">Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Created</TableHead>
            <TableHead>Date Published</TableHead>
            <TableHead className="text-center">Views</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="font-medium hover:text-primary">
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" title={post.title}>
                  {post.title.length > 50 ? `${post.title.substring(0, 50)}...` : post.title}
                </a>
              </TableCell>
              <TableCell>{post.authorDisplayName}</TableCell>
              <TableCell>
                <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                  {post.status}
                </Badge>
              </TableCell>
              <TableCell>
                {post.createdAt ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                {post.publishedAt ? format(post.publishedAt.toDate(), 'MMM d, yyyy') : 'N/A'}
              </TableCell>
              <TableCell className="text-center">{post.views}</TableCell>
              <TableCell className="text-right">
                <PostTableRowActions post={post} onDelete={() => onDeletePost(post)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
