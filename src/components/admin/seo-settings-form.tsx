
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { SeoSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Rocket } from 'lucide-react';
import { siteConfig } from '@/config/site';

const defaultSettings: SeoSettings = {
  metaDescription: siteConfig.description,
  metaKeywords: [
    "decentralized blogging", "Mindly blogging platform", "earn rewards",
    "content creation", "global community", "web3 blogging", "share ideas",
    "monetize content", "blog monetization", "decentralized content platform"
  ]
};

export default function SeoSettingsForm() {
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const settingsDocRef = doc(db, 'settings', 'seo');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SeoSettings;
          setDescription(data.metaDescription || defaultSettings.metaDescription || '');
          setKeywords((data.metaKeywords || defaultSettings.metaKeywords || []).join(', '));
        } else {
          setDescription(defaultSettings.metaDescription || '');
          setKeywords((defaultSettings.metaKeywords || []).join(', '));
        }
      } catch (error) {
        console.error("Error fetching SEO settings:", error);
        toast({ title: 'Error', description: 'Could not load SEO settings.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [toast, settingsDocRef]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    
    const keywordsArray = keywords.split(',').map(k => k.trim()).filter(Boolean);

    if (description.length > 160) {
        toast({ title: 'Warning', description: 'Meta description is ideally under 160 characters.', variant: 'default' });
    }

    const dataToSave: SeoSettings = {
        metaDescription: description,
        metaKeywords: keywordsArray
    };

    try {
      await setDoc(settingsDocRef, dataToSave);
      toast({
        title: 'SEO Settings Saved!',
        description: 'Your homepage meta tags have been updated successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error("Error saving SEO settings:", error);
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save SEO settings.',
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
          <CardTitle className="flex items-center"><Rocket className="mr-2" /> Homepage SEO</CardTitle>
          <CardDescription>Loading SEO settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Rocket className="mr-2" /> Homepage SEO Settings</CardTitle>
          <CardDescription>
            Manage the meta description and keywords for your homepage. These tags are crucial for search engine visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A compelling summary of your site (150-160 characters recommended)."
              rows={4}
              maxLength={160}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{description.length} / 160</p>
          </div>
          <div>
            <Label htmlFor="metaKeywords">Meta Keywords</Label>
            <Textarea
              id="metaKeywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Enter keywords separated by commas, e.g., blogging, tech, travel"
              rows={4}
              disabled={isSaving}
            />
             <p className="text-xs text-muted-foreground mt-1">Comma-separated list of keywords.</p>
          </div>
        </CardContent>
        <CardFooter>
            <Button type="submit" disabled={isSaving || isLoading} size="lg">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save SEO Settings
            </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
