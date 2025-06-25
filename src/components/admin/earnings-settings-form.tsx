
"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { EarningsSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle, Info, DollarSign } from 'lucide-react';

const defaultSettings: EarningsSettings = {
  baseEarningPerView: 0.01,
  minimumWithdrawalAmount: 10,
  minimumViewDuration: 5,
};

export default function EarningsSettingsForm() {
  const [settings, setSettings] = useState<EarningsSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const settingsDocRef = useMemo(() => doc(db, 'settings', 'earnings'), []);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<EarningsSettings>;
        setSettings({
          baseEarningPerView: typeof data.baseEarningPerView === 'number' ? data.baseEarningPerView : defaultSettings.baseEarningPerView,
          minimumWithdrawalAmount: typeof data.minimumWithdrawalAmount === 'number' ? data.minimumWithdrawalAmount : defaultSettings.minimumWithdrawalAmount,
          minimumViewDuration: typeof data.minimumViewDuration === 'number' ? data.minimumViewDuration : defaultSettings.minimumViewDuration,
        });
      } else {
        setSettings(defaultSettings);
        console.warn("Earnings settings document ('settings/earnings') not found. Using defaults.");
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching earnings settings for form:", error);
      toast({
        title: 'Error Loading Settings',
        description: 'Could not load earnings settings. Please try again.',
        variant: 'destructive',
      });
      setSettings(defaultSettings); 
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, settingsDocRef]);

  const handleInputChange = (key: keyof EarningsSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    const parsedRate = parseFloat(String(settings.baseEarningPerView));
    const parsedMinWithdrawal = parseFloat(String(settings.minimumWithdrawalAmount));
    const parsedMinDuration = parseInt(String(settings.minimumViewDuration), 10);

    if (isNaN(parsedRate) || parsedRate < 0) {
      toast({
        title: 'Invalid Rate',
        description: 'Base Earning Per View must be a non-negative number.',
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }
     if (isNaN(parsedMinWithdrawal) || parsedMinWithdrawal < 0) {
      toast({
        title: 'Invalid Minimum Withdrawal',
        description: 'Minimum Withdrawal Amount must be a non-negative number.',
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }
     if (isNaN(parsedMinDuration) || parsedMinDuration < 0) {
      toast({
        title: 'Invalid Duration',
        description: 'Minimum View Duration must be a non-negative number.',
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }


    try {
      const docSnap = await getDoc(settingsDocRef);
      const dataToSave: EarningsSettings = {
        baseEarningPerView: parsedRate,
        minimumWithdrawalAmount: parsedMinWithdrawal,
        minimumViewDuration: parsedMinDuration,
      };

      if (docSnap.exists()) {
        await updateDoc(settingsDocRef, dataToSave);
      } else {
        await setDoc(settingsDocRef, dataToSave);
      }
      toast({
        title: 'Settings Saved!',
        description: 'Earnings settings have been updated successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error("Error saving earnings settings:", error);
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save earnings settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2" /> Earnings Configuration</CardTitle>
          <CardDescription>Loading earnings settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2" /> Earnings Configuration</CardTitle>
          <CardDescription>
            Set global earning rates and withdrawal parameters for the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 p-3 border border-blue-500/30 rounded-lg bg-blue-500/5 text-blue-700 dark:text-blue-300 text-sm">
            <Info className="h-5 w-5 mt-0.5 shrink-0" />
            <p>These settings define how virtual currency is earned and can be withdrawn.</p>
          </div>
          <div>
            <Label htmlFor="baseEarningPerView">Base Earning Per View ($)</Label>
            <Input
              id="baseEarningPerView"
              type="number"
              step="0.001"
              min="0"
              value={settings.baseEarningPerView}
              onChange={(e) => handleInputChange('baseEarningPerView', e.target.value)}
              placeholder="e.g., 0.01"
            />
             <p className="text-xs text-muted-foreground mt-1">Amount earned per single view on a blog post.</p>
          </div>
           <div>
            <Label htmlFor="minimumWithdrawalAmount">Minimum Withdrawal Amount ($)</Label>
            <Input
              id="minimumWithdrawalAmount"
              type="number"
              step="1"
              min="0"
              value={settings.minimumWithdrawalAmount}
              onChange={(e) => handleInputChange('minimumWithdrawalAmount', e.target.value)}
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground mt-1">The minimum virtual currency a user must have to request a withdrawal.</p>
          </div>
           <div>
            <Label htmlFor="minimumViewDuration">Minimum View Duration (seconds)</Label>
            <Input
              id="minimumViewDuration"
              type="number"
              step="1"
              min="0"
              value={settings.minimumViewDuration ?? 5}
              onChange={(e) => handleInputChange('minimumViewDuration', e.target.value)}
              placeholder="e.g., 5"
            />
            <p className="text-xs text-muted-foreground mt-1">The time a user must stay on a page for a view to be counted. Set to 0 for instant view count.</p>
          </div>
        </CardContent>
         <CardFooter>
          <Button type="submit" disabled={isSaving || isLoading} size="lg" className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Earnings Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
