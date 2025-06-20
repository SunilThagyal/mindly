
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserCircle, Send, MessageCircle, Loader2, Trash2, Edit3 } from 'lucide-react';
import type { Comment as CommentType } from '@/lib/types'; // Renamed to avoid conflict
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added missing import
} from "@/components/ui/alert-dialog";


interface CommentsSectionProps {
  blogId: string;
  blogAuthorId: string; // Added prop
  blogTitle: string;    // Added prop
  blogSlug: string;     // Added prop
}

export default function CommentsSection({ blogId, blogAuthorId, blogTitle, blogSlug }: CommentsSectionProps) {
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); 


  useEffect(() => {
    if (!blogId) {
        setLoadingComments(false);
        return;
    }
    const q = query(
      collection(db, 'blogs', blogId, 'comments'),
      orderBy('createdAt', 'asc') 
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedComments: CommentType[] = [];
      querySnapshot.forEach((doc) => {
        fetchedComments.push({ id: doc.id, ...doc.data() } as CommentType);
      });
      setComments(fetchedComments);
      setLoadingComments(false);
    }, (error) => {
      console.error("Error fetching comments: ", error);
      toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [blogId, toast]);

  const handlePostComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !newComment.trim()) {
        if (!user) toast({ title: "Login Required", description: "Please log in to post a comment.", variant: "destructive"});
        return;
    }
    setSubmitting(true);
    try {
      const commentRef = await addDoc(collection(db, 'blogs', blogId, 'comments'), {
        userId: user.uid,
        userName: userProfile.displayName || 'Anonymous',
        userPhotoURL: userProfile.photoURL || null,
        text: newComment.trim(),
        createdAt: serverTimestamp() as Timestamp,
      });
      setNewComment('');
      toast({ title: "Comment Posted!", description: "Your comment has been added." });

      // Create notification for blog author if commenter is not the author
      if (user.uid !== blogAuthorId) {
        const notificationRef = collection(db, 'users', blogAuthorId, 'notifications');
        await addDoc(notificationRef, {
          type: 'new_comment',
          blogId: blogId,
          blogSlug: blogSlug,
          blogTitle: blogTitle,
          commenterName: userProfile.displayName || 'Anonymous',
          commentId: commentRef.id,
          createdAt: serverTimestamp(),
          isRead: false,
          link: `/blog/${blogSlug}#comment-${commentRef.id}`, // Basic link
        });
      }

    } catch (error) {
      console.error("Error posting comment: ", error);
      toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment: CommentType) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editingText.trim()) return;
    setSubmitting(true);
    try {
      const commentRef = doc(db, 'blogs', blogId, 'comments', editingCommentId);
      await updateDoc(commentRef, { text: editingText.trim() });
      setEditingCommentId(null);
      setEditingText('');
      toast({ title: "Comment Updated", description: "Your comment has been updated." });
    } catch (error) {
      console.error("Error updating comment: ", error);
      toast({ title: "Error", description: "Could not update comment.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setIsDeleting(commentId);
    try {
      await deleteDoc(doc(db, 'blogs', blogId, 'comments', commentId));
      toast({ title: "Comment Deleted", description: "The comment has been removed." });
    } catch (error) {
      console.error("Error deleting comment: ", error);
      toast({ title: "Error", description: "Could not delete comment.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground flex items-center">
        <MessageCircle className="mr-3 h-7 w-7 text-primary" /> Comments ({comments.length})
      </h2>
      
      {user && (
        <form onSubmit={handlePostComment} className="mb-8 p-4 border rounded-lg bg-card shadow">
          <h3 className="text-lg font-semibold mb-3 text-card-foreground">Leave a Comment</h3>
          <div className="flex items-start space-x-3">
            <Avatar className="mt-1">
              <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName || 'User'}/>
              <AvatarFallback>
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserCircle />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your insightful comment here..."
                rows={3}
                className="mb-3 text-base"
                disabled={submitting}
                aria-label="New comment"
              />
              <Button type="submit" disabled={submitting || !newComment.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {submitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Post Comment
              </Button>
            </div>
          </div>
        </form>
      )}
      {!user && (
        <div className="mb-8 p-4 border rounded-lg bg-muted text-center">
            <p className="text-muted-foreground">Please <a href="/auth/login" className="text-primary hover:underline font-semibold">log in</a> to post a comment.</p>
        </div>
      )}


      {loadingComments && (
        <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading comments...</p>
        </div>
      )}
      
      <div className="space-y-6">
        {comments.length === 0 && !loadingComments && (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-lg shadow-sm">
                <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
        )}
        {comments.map(comment => (
          <div key={comment.id} className="flex items-start space-x-3 p-4 bg-card rounded-lg shadow-sm transition-all hover:shadow-md">
            <Avatar className="h-10 w-10">
              <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userName}/>
              <AvatarFallback>
                {comment.userName ? comment.userName.charAt(0).toUpperCase() : <UserCircle />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-card-foreground">{comment.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {comment.createdAt ? new Date(comment.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                </p>
              </div>
              {editingCommentId === comment.id ? (
                <div>
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    className="mb-2 text-sm"
                    disabled={submitting}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm" disabled={submitting || !editingText.trim()} variant="outline">
                      {submitting ? <Loader2 className="animate-spin" /> : 'Save'}
                    </Button>
                    <Button onClick={() => setEditingCommentId(null)} size="sm" variant="ghost">Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{comment.text}</p>
              )}
              {(user?.uid === comment.userId || isAdmin) && editingCommentId !== comment.id && (
                <div className="mt-2 flex gap-2">
                   {user?.uid === comment.userId && (
                    <Button onClick={() => handleEditComment(comment)} size="sm" variant="ghost" className="text-xs p-1 h-auto">
                        <Edit3 className="mr-1 h-3 w-3" /> Edit
                    </Button>
                   )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs p-1 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting === comment.id}
                      >
                        {isDeleting === comment.id ? <Loader2 className="animate-spin h-3 w-3" /> : <Trash2 className="mr-1 h-3 w-3" />} Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting === comment.id}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteComment(comment.id)} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting === comment.id}>
                          {isDeleting === comment.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                          Yes, delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
