
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
      keywords: data.keywords || [],
      views: data.views || 0,
      readingTime: data.readingTime || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt,
      publishedAt: data.publishedAt,
      coverImageUrl: data.coverImageUrl || null,
      coverMediaType: data.coverMediaType || null,
      metaDescription: data.metaDescription || null,
      likes: data.likes || 0,
      likedBy: data.likedBy || [],
    } as Blog;
  });
}

async function getTotalWithdrawnAmount(userId: string): Promise<number> {
  const requestsCol = collection(db, 'withdrawalRequests');
  const q = query(requestsCol, where('userId', '==', userId), where('status', '==', 'completed'));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return 0;
  }

  return snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
}


export async function generateMetadata({ params }: { params: { userId: string } }): Promise<Metadata> {
  const profile = await getUserProfile(params.userId);

  if (!profile) {
    return {
      title: 'User Not Found',
    };
  }

  const displayName = profile.displayName || 'Anonymous User';
  const description = profile.bio || `Check out the profile and blog posts by ${displayName} on Mindly.`;

  return {
    title: `${displayName}'s Profile`,
    description: description,
    alternates: {
      canonical: `/profile/${params.userId}`,
    },
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

  let blogsFromDB: Blog[] = [];
  let fetchError: { message: string; indexLink: string | null } | null = null;
  
  try {
    blogsFromDB = await getUserBlogs(userId);
  } catch (error: any) {
    const errorMessage = error.message || "An unknown error occurred.";
    if (errorMessage.includes("firestore/failed-precondition") && errorMessage.includes("query requires an index")) {
        const urlMatch = errorMessage.match(/https?:\/\/[^\s)]+/);
        fetchError = {
            message: "A database index is required to display this user's blogs. This is a common one-time setup step for Firestore.",
            indexLink: urlMatch ? urlMatch[0] : null
        };
    } else {
        fetchError = {
            message: "An error occurred while fetching this user's blogs.",
            indexLink: null
        };
    }
  }

  const totalWithdrawn = await getTotalWithdrawnAmount(userId);
  
  const blogs = fetchError ? [] : blogsFromDB.map(blog => ({
    ...blog,
    createdAt: JSON.parse(JSON.stringify(blog.createdAt)),
    publishedAt: blog.publishedAt ? JSON.parse(JSON.stringify(blog.publishedAt)) : null,
  }));


  return <UserProfileView profile={profile} blogs={blogs} totalWithdrawn={totalWithdrawn} fetchError={fetchError} />;
}
