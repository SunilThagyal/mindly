
"use client";

// import { useState, useEffect } from 'react';
// import { useAuth } from '@/context/auth-context';
// import { db } from '@/lib/firebase';
// import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
// import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { UserCircle } from 'lucide-react';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  text: string;
  createdAt: Timestamp;
}

interface CommentsSectionProps {
  blogId: string;
}

// Stub component - full implementation requires more complex state management and Firestore rules
export default function CommentsSection({ blogId }: CommentsSectionProps) {
  // const { user, userProfile } = useAuth();
  // const [comments, setComments] = useState<Comment[]>([]);
  // const [newComment, setNewComment] = useState('');
  // const [loadingComments, setLoadingComments] = useState(true);
  // const [submitting, setSubmitting] = useState(false);

  // useEffect(() => {
  //   const q = query(
  //     collection(db, 'blogs', blogId, 'comments'),
  //     orderBy('createdAt', 'desc')
  //   );
  //   const unsubscribe = onSnapshot(q, (querySnapshot) => {
  //     const fetchedComments: Comment[] = [];
  //     querySnapshot.forEach((doc) => {
  //       fetchedComments.push({ id: doc.id, ...doc.data() } as Comment);
  //     });
  //     setComments(fetchedComments);
  //     setLoadingComments(false);
  //   }, (error) => {
  //     console.error("Error fetching comments: ", error);
  //     setLoadingComments(false);
  //   });

  //   return () => unsubscribe();
  // }, [blogId]);

  // const handlePostComment = async () => {
  //   if (!user || !userProfile || !newComment.trim()) return;
  //   setSubmitting(true);
  //   try {
  //     await addDoc(collection(db, 'blogs', blogId, 'comments'), {
  //       userId: user.uid,
  //       userName: userProfile.displayName || 'Anonymous',
  //       userPhotoURL: userProfile.photoURL || null,
  //       text: newComment.trim(),
  //       createdAt: serverTimestamp(),
  //     });
  //     setNewComment('');
  //   } catch (error) {
  //     console.error("Error posting comment: ", error);
  //     // Add toast notification for error
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Comments</h2>
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">
          Comments section functionality will be implemented here.
          <br />
          (Users will be able to read and post comments for blog ID: {blogId})
        </p>
      </div>
      {/* 
      {user && (
        <div className="mb-8 p-4 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-3 text-card-foreground">Leave a Comment</h3>
          <div className="flex items-start space-x-3">
            <Avatar>
              <AvatarImage src={userProfile?.photoURL || undefined} />
              <AvatarFallback>
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserCircle />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment..."
                rows={3}
                className="mb-2"
                disabled={submitting}
              />
              <Button onClick={handlePostComment} disabled={submitting || !newComment.trim()}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loadingComments && <p>Loading comments...</p>}
      
      <div className="space-y-6">
        {comments.length === 0 && !loadingComments && <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>}
        {comments.map(comment => (
          <div key={comment.id} className="flex items-start space-x-3 p-3 bg-card rounded-md shadow-sm">
            <Avatar className="h-10 w-10">
              <AvatarImage src={comment.userPhotoURL || undefined} />
              <AvatarFallback>
                {comment.userName ? comment.userName.charAt(0).toUpperCase() : <UserCircle />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-card-foreground">{comment.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {comment.createdAt ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : ''}
                </p>
              </div>
              <p className="text-sm text-card-foreground mt-1">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
      */}
    </section>
  );
}
