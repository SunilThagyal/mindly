
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { AdSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const defaultSettings: AdSettings = {
  adsEnabled: true,
  adDensity: 'high',
};

export default function AdSettingsForm() {
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const settingsDocRef = doc(db, 'settings', 'ads');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AdSettings);
      } else {
        // If doc doesn't exist, set to defaults (and maybe create it later on save)
        setSettings(defaultSettings);
         console.warn("Ad settings document ('settings/ads') not found in Firestore. Using default ad settings for form.");
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching ad settings for form:", error);
      toast({
        title: 'Error Loading Settings',
        description: 'Could not load ad settings. Please try again.',
        variant: 'destructive',
      });
      setSettings(defaultSettings); // Fallback to defaults
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAdsEnabledChange = (checked: boolean) => {
    if (settings) {
      setSettings({ ...settings, adsEnabled: checked });
    }
  };

  const handleAdDensityChange = (value: string) => {
    if (settings && (value === 'high' || value === 'medium' || value === 'low')) {
      setSettings({ ...settings, adDensity: value });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) {
      toast({ title: 'Error', description: 'Settings not loaded.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      // Check if doc exists to decide between setDoc (with merge) or updateDoc
      const docSnap = await getDoc(settingsDocRef);
      if (docSnap.exists()) {
        await updateDoc(settingsDocRef, settings);
      } else {
        // Create the document if it doesn't exist
        await setDoc(settingsDocRef, settings);
      }
      toast({
        title: 'Settings Saved!',
        description: 'Ad settings have been updated successfully.',
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (error: any) {
      console.error("Error saving ad settings:", error);
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save ad settings.',
        variant: 'destructive',
        action: <AlertTriangle className="text-red-500" />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ad Settings Management</CardTitle>
          <CardDescription>Loading ad settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (!settings) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Ad Settings Management</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
          <p className="text-destructive">Could not load ad settings. Please refresh or check console.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="bg-background/50 border-accent/30">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Ad Settings Management</CardTitle>
        <CardDescription>
          Control ad display and density across the application. Changes will apply in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
            <Label htmlFor="adsEnabled" className="text-base font-medium flex flex-col">
              Enable Ads
              <span className="text-xs text-muted-foreground font-normal">Turn ads on or off globally.</span>
            </Label>
            <Switch
              id="adsEnabled"
              checked={settings.adsEnabled}
              onCheckedChange={handleAdsEnabledChange}
              aria-label="Toggle ads"
            />
          </div>

          <div className="space-y-3 p-3 border rounded-lg">
            <Label className="text-base font-medium">Ad Density</Label>
            <p className="text-xs text-muted-foreground">
              Control how many in-content ads are displayed.
            </p>
            <RadioGroup
              value={settings.adDensity}
              onValueChange={handleAdDensityChange}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
            >
              {(['low', 'medium', 'high'] as const).map(densityValue => (
                <div key={densityValue} className="flex items-center space-x-2 p-3 bg-background rounded-md border border-input hover:border-primary transition-colors">
                  <RadioGroupItem value={densityValue} id={`density-${densityValue}`} />
                  <Label htmlFor={`density-${densityValue}`} className="capitalize font-normal cursor-pointer flex-1">
                    {densityValue}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" disabled={isSaving || isLoading} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
