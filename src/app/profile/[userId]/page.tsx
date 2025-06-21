
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UserProfileView from '@/components/profile/user-profile-view';
import type { UserProfile, Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
}

async function getUserBlogs(userId: string): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  const q = query(
    blogsCol,
    where('authorId', '==', userId),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
     return {
      id: doc.id,
      ...data,
      title: data.title || '',
      content: data.content || '',
      slug: data.slug || '',
      authorId: data.authorId || '',
      authorDisplayName: data.authorDisplayName || null,
      authorPhotoURL: data.authorPhotoURL || null,
      tags: data.tags || [],
      views: data.views || 0,
      readingTime: data.readingTime || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt,
      publishedAt: data.publishedAt,
      coverImageUrl: data.coverImageUrl || null,
      likes: data.likes || 0,
      likedBy: data.likedBy || [],
    } as Blog;
  });
}


export async function generateMetadata({ params }: { params: { userId: string } }): Promise<Metadata> {
  const profile = await getUserProfile(params.userId);

  if (!profile) {
    return {
      title: 'User Not Found',
    };
  }

  const displayName = profile.displayName || 'Anonymous User';
  const description = profile.bio || `Check out the profile and blog posts by ${displayName} on Blogchain.`;

  return {
    title: `${displayName}'s Profile`,
    description: description,
    openGraph: {
      title: `${displayName}'s Profile`,
      description: description,
      images: [
        {
          url: profile.photoURL || '/default-og-image.png',
          width: 800,
          height: 800,
          alt: displayName,
        },
      ],
    },
  };
}


export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  if (!userId) {
    notFound();
  }

  const profile = await getUserProfile(userId);
  
  if (!profile) {
    notFound();
  }

  const blogsFromDB = await getUserBlogs(userId);
  
  // Serialize the blogs array to make it safe to pass to the client component
  const blogs = blogsFromDB.map(blog => ({
    ...blog,
    // Convert Timestamps to plain objects that are JSON serializable
    createdAt: JSON.parse(JSON.stringify(blog.createdAt)),
    publishedAt: blog.publishedAt ? JSON.parse(JSON.stringify(blog.publishedAt)) : null,
  }));


  return <UserProfileView profile={profile} blogs={blogs} />;
}
