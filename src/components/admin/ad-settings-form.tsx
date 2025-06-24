
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { AdSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const defaultSettings: AdSettings = {
  adsEnabled: true,
  adDensity: 'high',
  adsenseClientId: '',
  adsenseHeaderSlotId: '',
  adsenseInContentSlotId: '',
  adsenseSidebarSlotId: '',
  adsenseBelowContentSlotId: '',
  adsenseMobileStickyFooterSlotId: '',
};

export default function AdSettingsForm() {
  const [settings, setSettings] = useState<AdSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const settingsDocRef = doc(db, 'settings', 'ads');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AdSettings>;
        setSettings({
            adsEnabled: typeof data.adsEnabled === 'boolean' ? data.adsEnabled : defaultSettings.adsEnabled,
            adDensity: data.adDensity || defaultSettings.adDensity,
            adsenseClientId: data.adsenseClientId || defaultSettings.adsenseClientId,
            adsenseHeaderSlotId: data.adsenseHeaderSlotId || defaultSettings.adsenseHeaderSlotId,
            adsenseInContentSlotId: data.adsenseInContentSlotId || defaultSettings.adsenseInContentSlotId,
            adsenseSidebarSlotId: data.adsenseSidebarSlotId || defaultSettings.adsenseSidebarSlotId,
            adsenseBelowContentSlotId: data.adsenseBelowContentSlotId || defaultSettings.adsenseBelowContentSlotId,
            adsenseMobileStickyFooterSlotId: data.adsenseMobileStickyFooterSlotId || defaultSettings.adsenseMobileStickyFooterSlotId,
        });
      } else {
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
      setSettings(defaultSettings); 
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleInputChange = (key: keyof AdSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const docSnap = await getDoc(settingsDocRef);
      const dataToSave = { ...settings }; 
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key as keyof AdSettings] === undefined) {
          (dataToSave[key as keyof AdSettings] as any) = null; 
        }
      });


      if (docSnap.exists()) {
        await updateDoc(settingsDocRef, dataToSave);
      } else {
        await setDoc(settingsDocRef, dataToSave);
      }
      toast({
        title: 'Settings Saved!',
        description: 'Ad settings have been updated successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error("Error saving ad settings:", error);
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save ad settings.',
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
          <CardTitle>Global Ad Settings</CardTitle>
          <CardDescription>Loading ad settings...</CardDescription>
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
          <CardTitle>Global Ad Controls</CardTitle>
          <CardDescription>
            Manage overall ad display and density across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
            <Label htmlFor="adsEnabled" className="text-base font-medium flex flex-col">
              Enable Ads Globally
              <span className="text-xs text-muted-foreground font-normal">Turn ads on or off for the entire site.</span>
            </Label>
            <Switch
              id="adsEnabled"
              checked={settings.adsEnabled}
              onCheckedChange={(checked) => handleInputChange('adsEnabled', checked)}
              aria-label="Toggle ads"
            />
          </div>

          <div className="space-y-3 p-3 border rounded-lg">
            <Label className="text-base font-medium">Ad Density</Label>
            <p className="text-xs text-muted-foreground">
              Control how many in-content ads are displayed (if ads are enabled).
            </p>
            <RadioGroup
              value={settings.adDensity}
              onValueChange={(value) => handleInputChange('adDensity', value)}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AdSense Configuration</CardTitle>
          <CardDescription>
            Enter your Google AdSense Client ID and Ad Unit Slot IDs for each placement.
            Leave slot IDs blank if a particular ad type is not used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-start gap-2 p-3 border border-blue-500/30 rounded-lg bg-blue-500/5 text-blue-700 dark:text-blue-300 text-sm">
            <Info className="h-5 w-5 mt-0.5 shrink-0" />
            <p>Ensure you have included the main AdSense script in your site's <code className="text-xs bg-blue-500/10 px-1 rounded">&lt;head&gt;</code> tag. Ad placeholders will only render if both Client ID and the respective Slot ID are provided and ads are globally enabled.</p>
          </div>

          <div>
            <Label htmlFor="adsenseClientId">AdSense Client ID (e.g., ca-pub-XXXX)</Label>
            <Input
              id="adsenseClientId"
              value={settings.adsenseClientId || ''}
              onChange={(e) => handleInputChange('adsenseClientId', e.target.value)}
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            />
          </div>
          <div>
            <Label htmlFor="adsenseHeaderSlotId">Header Ad Unit Slot ID</Label>
            <Input
              id="adsenseHeaderSlotId"
              value={settings.adsenseHeaderSlotId || ''}
              onChange={(e) => handleInputChange('adsenseHeaderSlotId', e.target.value)}
              placeholder="Slot ID for leaderboard ad"
            />
          </div>
           <div>
            <Label htmlFor="adsenseInContentSlotId">In-Content Ad Unit Slot ID</Label>
            <Input
              id="adsenseInContentSlotId"
              value={settings.adsenseInContentSlotId || ''}
              onChange={(e) => handleInputChange('adsenseInContentSlotId', e.target.value)}
              placeholder="Slot ID for in-content ads"
            />
          </div>
           <div>
            <Label htmlFor="adsenseSidebarSlotId">Sidebar Ad Unit Slot ID (Desktop)</Label>
            <Input
              id="adsenseSidebarSlotId"
              value={settings.adsenseSidebarSlotId || ''}
              onChange={(e) => handleInputChange('adsenseSidebarSlotId', e.target.value)}
              placeholder="Slot ID for sidebar skyscraper ad"
            />
          </div>
          <div>
            <Label htmlFor="adsenseBelowContentSlotId">Below Content Ad Unit Slot ID</Label>
            <Input
              id="adsenseBelowContentSlotId"
              value={settings.adsenseBelowContentSlotId || ''}
              onChange={(e) => handleInputChange('adsenseBelowContentSlotId', e.target.value)}
              placeholder="Slot ID for ad below post content"
            />
          </div>
          <div>
            <Label htmlFor="adsenseMobileStickyFooterSlotId">Mobile Sticky Footer Ad Slot ID</Label>
            <Input
              id="adsenseMobileStickyFooterSlotId"
              value={settings.adsenseMobileStickyFooterSlotId || ''}
              onChange={(e) => handleInputChange('adsenseMobileStickyFooterSlotId', e.target.value)}
              placeholder="Slot ID for mobile sticky anchor ad"
            />
          </div>
        </CardContent>
      </Card>
      
      <Button type="submit" disabled={isSaving || isLoading} size="lg" className="w-full sm:w-auto">
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save Ad Settings
      </Button>
    </form>
  );
}
