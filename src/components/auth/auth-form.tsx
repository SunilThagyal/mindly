
"use client";

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { siteConfig } from '@/config/site';

interface AuthFormProps {
  mode: 'signup' | 'login';
}

const ADMIN_USER_UID = process.env.NEXT_PUBLIC_ADMIN_USER_UID || process.env.ADMIN_USER_UID;

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { toast } = useToast();

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const redirectUrl = searchParams.get('redirect');

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          toast({ title: "Validation Error", description: "Display name is required.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        
        try {
            await sendEmailVerification(userCredential.user);
            toast({
              title: 'Account Created & Verification Email Sent!',
              description: `A verification email has been sent to ${userCredential.user.email}. Please check your inbox and spam folder to verify your account.`,
              variant: 'success',
              duration: 10000, 
            });
        } catch (verificationError: any) {
            console.error("Error sending verification email:", verificationError);
            toast({
                title: 'Account Created, But Verification Email Failed',
                description: `Your account was created, but we couldn't send the verification email. Error: ${verificationError.message}. You might need to try logging in and resending it.`,
                variant: 'destructive',
                duration: 10000,
            });
        }

        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const newUserProfile: UserProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
          photoURL: userCredential.user.photoURL,
          virtualEarnings: 0,
        };
        await setDoc(userDocRef, newUserProfile);
        router.push(`/auth/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`); 

      } else { // Login mode
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const loggedInUser = userCredential.user;

        const isAdminLogin = ADMIN_USER_UID && loggedInUser.uid === ADMIN_USER_UID;

        if (!isAdminLogin && !loggedInUser.emailVerified) {
           await auth.signOut(); 
           try {
               await sendEmailVerification(loggedInUser);
               toast({
                 title: 'Email Not Verified',
                 description: 'Your email is not verified. Please check your inbox (and spam/junk folder) for the verification link. A new verification email has been sent.',
                 variant: 'destructive',
                 duration: 10000,
               });
           } catch (resendError: any) {
                console.error("Error resending verification email:", resendError);
                toast({
                    title: 'Email Not Verified & Resend Failed',
                    description: `Your email is not verified. We also encountered an error trying to resend the verification email: ${resendError.message}`,
                    variant: 'destructive',
                    duration: 10000,
                });
           }
           setIsLoading(false);
           return;
        }
        toast({ title: 'Logged In!', description: `Welcome back, ${loggedInUser.displayName || 'User'}!`, variant: 'success' });
        router.push(redirectUrl || '/');
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSocialLogin = async (providerType: 'google' | 'github') => {
    let provider;
    if (providerType === 'google') {
      setIsGoogleLoading(true);
      provider = new GoogleAuthProvider();
    } else { // github
      setIsGithubLoading(true);
      provider = new GithubAuthProvider();
    }

    const redirectUrl = searchParams.get('redirect');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        const newUserProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          virtualEarnings: 0,
        };
        await setDoc(userDocRef, newUserProfile);
      }
      
      toast({ title: 'Logged In!', description: `Welcome, ${user.displayName || 'User'}!`, variant: 'success' });
      router.push(redirectUrl || '/');
    } catch (error: any) {
      toast({
        title: 'Social Login Error',
        description: error.message || 'Failed to login with social provider.',
        variant: 'destructive',
      });
    } finally {
      if (providerType === 'google') {
        setIsGoogleLoading(false);
      } else {
        setIsGithubLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">
            {mode === 'signup' ? 'Create an Account' : 'Welcome Back!'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? `Enter your details to join ${siteConfig.name}.`
              : 'Log in to continue your journey.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === 'signup' ? 'Sign Up' : 'Log In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
           <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isGoogleLoading || isGithubLoading || isLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path><path fill="none" d="M1 1h22v22H1z"></path></svg>}
              Google
            </Button>
            <Button variant="outline" onClick={() => handleSocialLogin('github')} disabled={isGoogleLoading || isGithubLoading || isLoading}>
              {isGithubLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>}
              GitHub
            </Button>
          </div>

          <div className="text-sm text-center text-muted-foreground">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <Link href={`/auth/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="font-medium text-primary hover:underline">
                  Log In
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                 <Link href={`/auth/signup${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="font-medium text-primary hover:underline">
                  Sign Up
                </Link>
                 <span className="mx-1">·</span>
                <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">
                  Forgot Password?
                </Link>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
