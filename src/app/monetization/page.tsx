
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import MonetizationForm from '@/components/monetization/monetization-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, DollarSign } from 'lucide-react';

export default function MonetizationPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login?redirect=/monetization');
      } else if (userProfile && !userProfile.isMonetizationApproved) {
        // Redirect or show a message if not approved
        // For now, let's show a message on this page
      }
    }
  }, [user, userProfile, authLoading, router]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading monetization details...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be caught by the useEffect redirect,
    // but as a fallback:
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
        <ShieldAlert className="w-20 h-20 text-destructive mb-6" />
        <h1 className="text-3xl font-headline font-bold text-foreground mb-4">Authentication Required</h1>
        <p className="text-lg text-muted-foreground">
          Please log in to manage your monetization settings.
        </p>
      </div>
    );
  }
  
  if (!userProfile.isMonetizationApproved) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto text-center shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-headline flex items-center justify-center">
              <DollarSign className="mr-3 h-8 w-8 text-primary" />
              Monetization Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground mb-2">
              Your account is not yet approved for monetization.
            </p>
            <p className="text-sm text-muted-foreground">
              Once an administrator approves your account, you will be able to set up your payment details and request withdrawals here.
              Please contact support or wait for approval.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
             <DollarSign className="mr-3 h-8 w-8 text-primary" />
            Monetization & Payouts
          </CardTitle>
          <CardDescription>
            Manage your payment information and request withdrawals for your earnings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonetizationForm userProfile={userProfile} userId={user.uid} />
        </CardContent>
      </Card>
    </div>
  );
}
