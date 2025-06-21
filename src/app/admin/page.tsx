
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Settings, Loader2, LayoutDashboard, Users, FileText, Annoyed, DollarSign, SendToBack, BellDot, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AdSettingsForm from '@/components/admin/ad-settings-form';
import UserManagementTab from '@/components/admin/user-management-tab';
import PostManagementTab from '@/components/admin/post-management-tab';
import EarningsSettingsForm from '@/components/admin/earnings-settings-form';
import WithdrawalManagementTab from '@/components/admin/withdrawal-management-tab';
import ThemeManagementTab from '@/components/admin/theme-management-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ADMIN_TABS = ['dashboard', 'ads', 'earnings', 'users', 'posts', 'withdrawals', 'theme'] as const;
type AdminTab = typeof ADMIN_TABS[number];

function isValidTab(tab: string | null): tab is AdminTab {
  return ADMIN_TABS.includes(tab as AdminTab);
}

async function fetchPendingWithdrawalCount(): Promise<number> {
  try {
    const requestsCol = collection(db, 'withdrawalRequests');
    const q = query(requestsCol, where('status', '==', 'pending'));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching pending withdrawal count:", error);
    return 0;
  }
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (isValidTab(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (tabFromUrl && tabFromUrl !== activeTab) { // Prevent pushing if already on dashboard by default
      router.push('/admin?tab=dashboard', { scroll: false });
    }
  }, [searchParams, router, activeTab]);


  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/auth/login?redirect=/admin${activeTab !== 'dashboard' ? `?tab=${activeTab}` : ''}`);
      } else if (isAdmin) {
        fetchPendingWithdrawalCount().then(setPendingWithdrawalCount);
      }
    }
  }, [user, isAdmin, loading, router, activeTab]);

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
      const currentAuthorId = searchParams.get('authorId');
      let queryString = `?tab=${value}`;
      if (value === 'posts' && currentAuthorId) {
        queryString += `&authorId=${currentAuthorId}`;
      }
      router.push(`/admin${queryString}`, { scroll: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-lg">Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
            <ShieldAlert className="w-20 h-20 text-destructive mb-6" />
            <h1 className="text-3xl font-headline font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-lg text-muted-foreground mb-8">
                Please log in to access the admin panel.
            </p>
            <Button asChild size="lg">
                <Link href={`/auth/login?redirect=/admin${activeTab !== 'dashboard' ? `?tab=${activeTab}` : ''}`}>Go to Login</Link>
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

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold text-foreground flex items-center">
            <Settings className="mr-3 h-10 w-10 text-primary" />
            Admin Panel
        </h1>
        <p className="text-muted-foreground">Welcome, Admin! Manage your application settings and content here.</p>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-md bg-muted p-1 sm:grid-cols-4 md:grid-cols-7 mb-6 h-auto">
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-1.5 h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="mr-1.5 h-4 w-4" />Theme</TabsTrigger>
          <TabsTrigger value="ads"><Annoyed className="mr-1.5 h-4 w-4" />Ads</TabsTrigger>
          <TabsTrigger value="earnings"><DollarSign className="mr-1.5 h-4 w-4" />Earnings</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="posts"><FileText className="mr-1.5 h-4 w-4" />Posts</TabsTrigger>
          <TabsTrigger value="withdrawals">
            <div className="flex items-center relative">
              <SendToBack className="mr-1.5 h-4 w-4" />Withdrawals
              {pendingWithdrawalCount > 0 && (
                <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
                  {pendingWithdrawalCount}
                </span>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>Overview and general analytics.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] space-y-6">
              <p className="text-muted-foreground">Analytics and overview will be displayed here. (Coming Soon)</p>
              
              {isAdmin && (
                <Card className="bg-accent/10 border-accent">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <BellDot className="mr-2 h-5 w-5 text-accent" />
                      Pending Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingWithdrawalCount > 0 ? (
                      <div className="flex items-center justify-between">
                        <p>
                          There {pendingWithdrawalCount === 1 ? "is" : "are"}{" "}
                          <span className="font-bold text-destructive">{pendingWithdrawalCount}</span> pending withdrawal
                          request{pendingWithdrawalCount === 1 ? "" : "s"}.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => handleTabChange('withdrawals')}>
                          View Requests
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No pending withdrawal requests.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <ThemeManagementTab />
        </TabsContent>

        <TabsContent value="ads">
          <AdSettingsForm />
        </TabsContent>

        <TabsContent value="earnings">
          <EarningsSettingsForm />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="posts">
          <PostManagementTab />
        </TabsContent>

        <TabsContent value="withdrawals">
          <WithdrawalManagementTab />
        </TabsContent>
      </Tabs>

       <Card className="mt-12 bg-background/50 border-muted">
        <CardHeader>
            <CardTitle className="text-xl font-semibold">Admin User Information</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
              The current Admin User UID is configured via the <code className="px-1 py-0.5 bg-muted rounded text-xs">ADMIN_USER_UID</code> environment variable.
            </p>
             <p className="text-xs text-muted-foreground mt-2">
              Ensure this matches the Firebase UID of your designated admin user. The value is read by Next.js during build/startup.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
