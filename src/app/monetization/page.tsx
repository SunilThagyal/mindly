
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import MonetizationForm from '@/components/monetization/monetization-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, DollarSign, History } from 'lucide-react';
import PaymentHistoryTable from '@/components/monetization/payment-history-table';
import type { WithdrawalRequest } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

async function getUserWithdrawalHistory(userId: string): Promise<WithdrawalRequest[]> {
    const requestsCol = collection(db, 'withdrawalRequests');
    const q = query(requestsCol, where('userId', '==', userId), orderBy('requestedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt : Timestamp.now(),
            processedAt: data.processedAt instanceof Timestamp ? data.processedAt : null,
        } as WithdrawalRequest;
    });
}


export default function MonetizationPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login?redirect=/monetization');
      } else if (userProfile && !userProfile.isMonetizationApproved) {
        // Message shown below
      } else if (user && userProfile?.isMonetizationApproved) {
        // Fetch withdrawal history only if user is approved and logged in
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const history = await getUserWithdrawalHistory(user.uid);
                setWithdrawalHistory(history);
            } catch (error) {
                console.error("Error fetching withdrawal history:", error);
                // Optionally, show a toast to the user
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
      }
    }
  }, [user, userProfile, authLoading, router]);

  if (authLoading || !userProfile && !user) { // If userProfile is null because user is null (and still loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading monetization details...</p>
      </div>
    );
  }
  
  if (!user) { // Should be caught by useEffect, but added for robustness
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
  
  if (!userProfile?.isMonetizationApproved) {
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
              Your account is not yet approved for monetization by an administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Once approved, you will be able to set up your payment details, view earnings history, and request withdrawals here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
             <DollarSign className="mr-3 h-8 w-8 text-primary" />
            Monetization & Payouts
          </CardTitle>
          <CardDescription>
            Manage your payment information and request withdrawals for your earnings.
            Your current earnings are updated automatically when your published posts receive views.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonetizationForm userProfile={userProfile} userId={user.uid} />
        </CardContent>
      </Card>

      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <History className="mr-3 h-7 w-7 text-primary" />
            Withdrawal History
          </CardTitle>
          <CardDescription>
            A record of your past withdrawal requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading history...</p>
            </div>
          ) : withdrawalHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-5">You have no withdrawal requests yet.</p>
          ) : (
            <PaymentHistoryTable requests={withdrawalHistory} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
