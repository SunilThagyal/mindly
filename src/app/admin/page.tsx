
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Settings, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login?redirect=/admin');
      } else if (!isAdmin) {
        // Keep non-admins on this page but show access denied
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-lg">Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
            <ShieldAlert className="w-20 h-20 text-destructive mb-6" />
            <h1 className="text-3xl font-headline font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-lg text-muted-foreground mb-8">
                Please log in to access the admin panel.
            </p>
            <Button asChild size="lg">
                <Link href="/auth/login?redirect=/admin">Go to Login</Link>
            </Button>
        </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
        <ShieldAlert className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-4xl font-headline font-bold text-foreground mb-4">Access Denied</h1>
        <p className="text-xl text-muted-foreground mb-8">
          You do not have permission to view this page.
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Admin view
  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Settings className="mr-3 h-8 w-8 text-primary" />
            Admin Panel
          </CardTitle>
          <CardDescription>
            Welcome, Admin! Manage your application settings here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg bg-background/50">
            <h3 className="text-xl font-semibold mb-2 text-foreground">Ad Settings Management</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Ad settings (enable/disable ads, ad density) are currently managed directly in your Firestore database.
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              Navigate to: <code className="px-1 py-0.5 bg-muted rounded text-xs">Firestore Database</code>
            </p>
            <p className="text-sm text-muted-foreground">
              Collection: <code className="px-1 py-0.5 bg-muted rounded text-xs">settings</code>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Document ID: <code className="px-1 py-0.5 bg-muted rounded text-xs">ads</code>
            </p>
            <Button variant="outline" asChild>
              <a 
                href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID"}/firestore/data/~2Fsettings~2Fads`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Go to Firestore (settings/ads)
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You may need to replace "YOUR_FIREBASE_PROJECT_ID" in the link if it's not automatically detected.
            </p>
          </div>
           <div className="p-4 border rounded-lg bg-background/50">
            <h3 className="text-xl font-semibold mb-2 text-foreground">Admin User UID</h3>
            <p className="text-sm text-muted-foreground">
              The current Admin User UID is configured in your <code className="px-1 py-0.5 bg-muted rounded text-xs">.env</code> file as <code className="px-1 py-0.5 bg-muted rounded text-xs">ADMIN_USER_UID</code>.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Make sure this matches the Firebase UID of your designated admin user.
            </p>
          </div>
          {/* Future admin panel features would go here */}
        </CardContent>
      </Card>
    </div>
  );
}
