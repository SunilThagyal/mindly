
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
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
import { Loader2, Phone } from 'lucide-react';

interface AuthFormProps {
  mode: 'signup' | 'login';
}

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
    }
}


const ADMIN_USER_UID = process.env.NEXT_PUBLIC_ADMIN_USER_UID || process.env.ADMIN_USER_UID;

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Phone Auth State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { toast } = useToast();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          toast({ title: 'reCAPTCHA Expired', description: 'Please try sending the OTP again.', variant: 'destructive' });
        }
      });
    }
  };

  useEffect(() => {
    if (showPhoneAuth) {
        setupRecaptcha();
    }
  }, [showPhoneAuth]);


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
              description: `IMPORTANT: A verification email has been sent to ${userCredential.user.email}. Please check your inbox (and especially your spam/junk folder) to verify your account before logging in.`,
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
        toast({ title: 'Logged In!', description: `Welcome back, ${loggedInUser.displayName || 'User'}!` });
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
  
  const handleSocialLogin = async (providerType: 'google') => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
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
      
      toast({ title: 'Logged In!', description: `Welcome, ${user.displayName || 'User'}!` });
      router.push(redirectUrl || '/');
    } catch (error: any) {
      toast({
        title: 'Social Login Error',
        description: error.message || 'Failed to login with social provider.',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onPhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsPhoneLoading(true);
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier!;
    try {
        const result = await signInWithPhoneNumber(auth, phone, appVerifier);
        setConfirmationResult(result);
        setIsOtpSent(true);
        toast({ title: 'OTP Sent!', description: `An OTP has been sent to ${phone}.`});
    } catch(error: any) {
        toast({ title: 'Phone Sign-in Error', description: error.message || 'Could not send OTP.', variant: 'destructive'});
        console.error(error);
    } finally {
        setIsPhoneLoading(false);
    }
  };

  const onOtpSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!confirmationResult || !otp.trim()) return;
      setIsPhoneLoading(true);
      const redirectUrl = searchParams.get('redirect');
      try {
        const result = await confirmationResult.confirm(otp);
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const isNewUser = !userDocSnap.exists();
        
        if (isNewUser) {
            const newUserProfile: UserProfile = {
                uid: user.uid,
                email: user.email, // Will be null for phone auth
                displayName: user.phoneNumber, // Use phone as temporary name
                photoURL: user.photoURL,
                virtualEarnings: 0,
            };
            await setDoc(userDocRef, newUserProfile);
            toast({ title: 'Welcome!', description: 'Please complete your profile details.' });
            router.push(`/profile/${user.uid}?setup=true`); // Redirect to profile setup
        } else {
            toast({ title: 'Logged In!', description: `Welcome back!` });
            router.push(redirectUrl || '/');
        }

      } catch (error: any) {
          toast({ title: 'OTP Verification Error', description: error.message || 'Invalid OTP.', variant: 'destructive'});
      } finally {
          setIsPhoneLoading(false);
      }
  };

  if (showPhoneAuth) {
    return (
        <div className="flex items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
          <Card className="w-full max-w-md shadow-xl">
             <form onSubmit={isOtpSent ? onOtpSubmit : onPhoneSubmit}>
                 <CardHeader>
                  <CardTitle className="text-3xl font-headline">
                    {isOtpSent ? 'Enter OTP' : 'Continue with Phone'}
                  </CardTitle>
                  <CardDescription>
                    {isOtpSent ? `We've sent a code to ${phone}.` : 'Please enter your phone number with country code.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div id="recaptcha-container"></div>
                  {!isOtpSent ? (
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 123 456 7890"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                  ) : (
                      <div className="space-y-2">
                        <Label htmlFor="otp">One-Time Password</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                        />
                      </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isPhoneLoading}>
                    {isPhoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isOtpSent ? 'Verify OTP' : 'Send OTP'}
                  </Button>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                   <Button variant="link" size="sm" onClick={() => setShowPhoneAuth(false)}>
                        Back to other login methods
                   </Button>
                </CardFooter>
             </form>
          </Card>
        </div>
    )
  }


  return (
    <div className="flex items-center justify-center py-12 min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">
            {mode === 'signup' ? 'Create an Account' : 'Welcome Back!'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Enter your details to join Blogchain.'
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
            <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isGoogleLoading || isLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path><path fill="none" d="M1 1h22v22H1z"></path></svg>}
              Google
            </Button>
            <Button variant="outline" onClick={() => setShowPhoneAuth(true)} disabled={isLoading}>
              <Phone className="mr-2 h-4 w-4" />
              Phone
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
