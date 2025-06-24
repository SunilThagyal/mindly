
"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, FieldValue } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserCircle, Send, MessageCircle, Loader2, Trash2, Edit3, CornerDownRight, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import type { Comment as CommentType, UserProfile as UserProfileType } from '@/lib/types'; 
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface CommentsSectionProps {
  blogId: string;
  blogAuthorId: string;
  blogTitle: string;
  blogSlug: string;
}

export default function CommentsSection({ blogId, blogAuthorId, blogTitle, blogSlug }: CommentsSectionProps) {
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [allComments, setAllComments] = useState<CommentType[]>([]);
  
  const [newCommentText, setNewCommentText] = useState('');
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({}); 

  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);


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
        fetchedComments.push({ id: doc.id, ...doc.data(), blogId } as CommentType);
      });
      setAllComments(fetchedComments);
      setLoadingComments(false);
    }, (error) => {
      console.error("Error fetching comments: ", error);
      toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [blogId, toast]);

  const topLevelComments = useMemo(() => {
    return allComments
      .filter(comment => !comment.parentId)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return aTime - bTime;
      });
  }, [allComments]);

  const getReplies = (parentId: string) => {
    return allComments
      .filter(comment => comment.parentId === parentId)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return aTime - bTime;
      });
  };

  const toggleRepliesVisibility = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };


  const handlePostComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !newCommentText.trim()) {
        if (!user) toast({ title: "Login Required", description: "Please log in to post a comment.", variant: "destructive"});
        return;
    }
    setSubmittingComment(true);
    try {
      const commentRef = await addDoc(collection(db, 'blogs', blogId, 'comments'), {
        userId: user.uid,
        userName: userProfile.displayName || 'Anonymous',
        userPhotoURL: userProfile.photoURL || null,
        text: newCommentText.trim(),
        createdAt: serverTimestamp() as Timestamp,
        parentId: null,
        blogId: blogId,
        likes: [],
      });
      setNewCommentText('');
      toast({ title: "Comment Posted!", description: "Your comment has been added.", variant: 'success' });

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
          link: `/blog/${blogSlug}#comment-${commentRef.id}`,
        });
      }

    } catch (error) {
      console.error("Error posting comment: ", error);
      toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!user || !userProfile || !replyText.trim() || !parentId) {
        if(!user) toast({ title: "Login Required", description: "Please log in to reply.", variant: "destructive"});
        return;
    }
    setSubmittingReply(parentId);
    
    const parentComment = allComments.find(c => c.id === parentId);
    if (!parentComment) {
        toast({ title: "Error", description: "Parent comment not found.", variant: "destructive" });
        setSubmittingReply(null);
        return;
    }

    try {
        const replyRef = await addDoc(collection(db, 'blogs', blogId, 'comments'), {
            userId: user.uid,
            userName: userProfile.displayName || 'Anonymous',
            userPhotoURL: userProfile.photoURL || null,
            text: replyText.trim(),
            createdAt: serverTimestamp() as Timestamp,
            parentId: parentId,
            blogId: blogId,
            likes: [],
        });
        setReplyText('');
        setReplyingToCommentId(null); 
        toast({ title: "Reply Posted!", description: "Your reply has been added.", variant: 'success' });
        setExpandedReplies(prev => ({ ...prev, [parentId]: true })); 

        if (user.uid !== parentComment.userId) {
            const notificationRef = collection(db, 'users', parentComment.userId, 'notifications');
            await addDoc(notificationRef, {
                type: 'new_reply',
                blogId: blogId,
                blogSlug: blogSlug,
                blogTitle: blogTitle,
                replierName: userProfile.displayName || 'Anonymous',
                commentId: replyRef.id, 
                parentCommentId: parentId,
                parentCommentAuthorId: parentComment.userId,
                createdAt: serverTimestamp(),
                isRead: false,
                link: `/blog/${blogSlug}#comment-${replyRef.id}`, 
            });
        }

    } catch (error) {
        console.error("Error posting reply: ", error);
        toast({ title: "Error", description: "Could not post reply.", variant: "destructive" });
    } finally {
        setSubmittingReply(null);
    }
  };


  const handleEditComment = (comment: CommentType) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
    setReplyingToCommentId(null); 
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editingText.trim()) return;
    setSubmittingComment(true); 
    try {
      const commentRef = doc(db, 'blogs', blogId, 'comments', editingCommentId);
      await updateDoc(commentRef, { text: editingText.trim() });
      setEditingCommentId(null);
      setEditingText('');
      toast({ title: "Comment Updated", description: "Your comment has been updated.", variant: 'success' });
    } catch (error) {
      console.error("Error updating comment: ", error);
      toast({ title: "Error", description: "Could not update comment.", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setIsDeleting(commentId);
    try {
      const repliesToDelete = allComments.filter(c => c.parentId === commentId);
      const batchOp = writeBatch(db); 
      
      repliesToDelete.forEach(reply => {
        batchOp.delete(doc(db, 'blogs', blogId, 'comments', reply.id));
      });
      batchOp.delete(doc(db, 'blogs', blogId, 'comments', commentId));
      
      await batchOp.commit();

      toast({ title: "Comment Deleted", description: "The comment and its replies have been removed.", variant: 'success' });
    } catch (error) {
      console.error("Error deleting comment: ", error);
      toast({ title: "Error", description: "Could not delete comment.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLikeComment = async (commentId: string, commentAuthorId: string) => {
    if (!user || !userProfile) {
      toast({ title: "Login Required", description: "Please log in to like a comment.", variant: "destructive" });
      return;
    }
    setLikingCommentId(commentId);

    const commentRef = doc(db, 'blogs', blogId, 'comments', commentId);
    const targetComment = allComments.find(c => c.id === commentId);
    if (!targetComment) return;

    const alreadyLiked = targetComment.likes?.includes(user.uid);
    
    // Optimistic UI update
    setAllComments(prevComments => 
        prevComments.map(c => {
            if (c.id === commentId) {
                const currentLikes = c.likes || [];
                return {
                    ...c,
                    likes: alreadyLiked 
                        ? currentLikes.filter(uid => uid !== user.uid)
                        : [...currentLikes, user.uid]
                };
            }
            return c;
        })
    );

    try {
      if (alreadyLiked) {
        await updateDoc(commentRef, {
          likes: arrayRemove(user.uid) as unknown as FieldValue // Firestore type fix
        });
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(user.uid) as unknown as FieldValue // Firestore type fix
        });

        if (user.uid !== commentAuthorId) {
          const notificationRef = collection(db, 'users', commentAuthorId, 'notifications');
          const commentTextSnippet = targetComment.text.substring(0, 50) + (targetComment.text.length > 50 ? "..." : "");
          await addDoc(notificationRef, {
            type: 'new_like',
            blogId: blogId,
            blogSlug: blogSlug,
            blogTitle: blogTitle,
            likerName: userProfile.displayName || 'Anonymous',
            commentId: commentId,
            likedCommentTextSnippet: commentTextSnippet,
            createdAt: serverTimestamp(),
            isRead: false,
            link: `/blog/${blogSlug}#comment-${commentId}`,
          });
        }
      }
    } catch (error) {
      console.error("Error liking comment: ", error);
      toast({ title: "Error", description: "Could not update like.", variant: "destructive" });
      // Revert optimistic update on error
       setAllComments(prevComments => 
        prevComments.map(c => {
            if (c.id === commentId) {
                 return targetComment; // Revert to original comment state
            }
            return c;
        })
      );
    } finally {
      setLikingCommentId(null);
    }
  };


  const renderComment = (comment: CommentType, isReply: boolean = false) => {
    const commentReplies = isReply ? [] : getReplies(comment.id);
    const areRepliesExpanded = !!expandedReplies[comment.id];
    const likeCount = comment.likes?.length || 0;
    const isLikedByCurrentUser = user && comment.likes?.includes(user.uid);

    return (
      <div key={comment.id} id={`comment-${comment.id}`} className={`flex items-start space-x-3 ${isReply ? 'ml-8 sm:ml-12' : ''}`}>
        <Avatar className="h-9 w-9">
          <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userName}/>
          <AvatarFallback>
            {comment.userName ? comment.userName.charAt(0).toUpperCase() : <UserCircle />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <p className="font-semibold text-xs text-card-foreground">{comment.userName}</p>
            <p className="text-xs text-muted-foreground">
              {comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
            </p>
          </div>
          {editingCommentId === comment.id ? (
            <div className="mt-1">
              <Textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                rows={2}
                className="mb-2 text-sm"
                disabled={submittingComment}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} size="sm" disabled={submittingComment || !editingText.trim()} variant="outline">
                  {submittingComment ? <Loader2 className="animate-spin" /> : 'Save'}
                </Button>
                <Button onClick={() => setEditingCommentId(null)} size="sm" variant="ghost">Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{comment.text}</p>
          )}
          <div className="mt-1.5 flex gap-2 items-center">
            <Button
              onClick={() => handleLikeComment(comment.id, comment.userId)}
              size="sm"
              variant="ghost"
              className={`text-xs p-1 h-auto ${isLikedByCurrentUser ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-primary'}`}
              disabled={!user || likingCommentId === comment.id}
            >
              {likingCommentId === comment.id ? <Loader2 className="animate-spin h-3 w-3" /> : <Heart className={`mr-1 h-3 w-3 ${isLikedByCurrentUser ? 'fill-red-500' : ''}`} />}
              {likeCount > 0 ? likeCount : ''}
            </Button>

            {!isReply && (
                <Button 
                    onClick={() => { setReplyingToCommentId(comment.id); setReplyText(''); setEditingCommentId(null);}} 
                    size="sm" 
                    variant="ghost" 
                    className="text-xs p-1 h-auto text-muted-foreground hover:text-primary"
                    disabled={submittingReply === comment.id}
                >
                    <CornerDownRight className="mr-1 h-3 w-3" /> Reply
                </Button>
            )}
            {(user?.uid === comment.userId || isAdmin) && editingCommentId !== comment.id && (
                <>
                {user?.uid === comment.userId && (
                    <Button onClick={() => handleEditComment(comment)} size="sm" variant="ghost" className="text-xs p-1 h-auto text-muted-foreground hover:text-primary">
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
                        Are you sure you want to delete this comment? {isReply ? '' : 'All replies to this comment will also be deleted.'} This action cannot be undone.
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
                </>
            )}
          </div>

          {replyingToCommentId === comment.id && !isReply && (
            <form onSubmit={(e) => { e.preventDefault(); handlePostReply(comment.id); }} className="mt-3 ml-0 flex items-start space-x-3">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName || 'User'}/>
                    <AvatarFallback>
                        {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserCircle />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Replying to ${comment.userName}...`}
                        rows={2}
                        className="mb-2 text-sm"
                        disabled={submittingReply === comment.id}
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={submittingReply === comment.id || !replyText.trim()} className="bg-accent hover:bg-accent/80 text-accent-foreground">
                            {submittingReply === comment.id ? <Loader2 className="animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                            Post Reply
                        </Button>
                        <Button type="button" onClick={() => setReplyingToCommentId(null)} size="sm" variant="ghost">Cancel</Button>
                    </div>
                </div>
            </form>
          )}

          {!isReply && commentReplies.length > 0 && (
            <Button
              onClick={() => toggleRepliesVisibility(comment.id)}
              variant="ghost"
              size="sm"
              className="mt-2 text-xs p-1 h-auto text-primary hover:text-primary/80"
            >
              {areRepliesExpanded ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
              {areRepliesExpanded ? 'Hide Replies' : `View ${commentReplies.length} ${commentReplies.length === 1 ? 'Reply' : 'Replies'}`}
            </Button>
          )}

          {areRepliesExpanded && commentReplies.length > 0 && (
            <div className="mt-4 space-y-4 pt-3 border-l-2 border-muted pl-3">
              {commentReplies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground flex items-center">
        <MessageCircle className="mr-3 h-7 w-7 text-primary" /> Discussion ({topLevelComments.length}{allComments.length > topLevelComments.length ? ` + ${allComments.length - topLevelComments.length} replies` : ''})
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
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write your insightful comment here..."
                rows={3}
                className="mb-3 text-base"
                disabled={submittingComment}
                aria-label="New comment"
              />
              <Button type="submit" disabled={submittingComment || !newCommentText.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {submittingComment ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
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
        {allComments.length === 0 && !loadingComments && (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-lg shadow-sm">
                <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
        )}
        {topLevelComments.map(comment => (
            <div key={comment.id} className="p-4 bg-card rounded-lg shadow-sm transition-all hover:shadow-md">
                {renderComment(comment)}
            </div>
        ))}
      </div>
    </section>
  );
}
