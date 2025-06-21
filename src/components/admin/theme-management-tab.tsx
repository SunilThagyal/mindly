
"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { ThemeSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle, Palette, Type, List, Info, Droplets } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';

const FONT_OPTIONS = {
    "System": ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
    "Serif": ["Georgia", "Times New Roman", "serif"],
    "Monospace": ["Courier New", "monospace"],
    "Google Fonts": ["Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat", "Merriweather", "Lora"],
};

// Helper function to convert hex to HSL string
function hexToHsl(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    return `${h} ${s}% ${l}%`;
}

export default function ThemeManagementTab() {
  const [settings, setSettings] = useState<Partial<ThemeSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const settingsDocRef = useMemo(() => doc(db, 'settings', 'theme'), []);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching theme settings:", error);
        toast({ title: 'Error', description: 'Could not load theme settings.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [settingsDocRef, toast]);

  const handleColorChange = (colorKey: keyof ThemeSettings, hexValue: string) => {
    setSettings(prev => ({ ...prev, [colorKey]: hexToHsl(hexValue) }));
  };

  const handleInputChange = (field: keyof ThemeSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const ColorInput = ({ label, colorKey, hint }: { label: string, colorKey: keyof ThemeSettings, hint: string }) => {
    const hslValue = settings[colorKey] as string || '';
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-24 justify-start">
                            <div className="w-4 h-4 rounded-full border mr-2" style={{ backgroundColor: `hsl(${hslValue})` }}/>
                            Preview
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0">
                        <HexColorPicker onChange={(hex) => handleColorChange(colorKey, hex)} />
                    </PopoverContent>
                </Popover>
                <Input
                    value={hslValue}
                    onChange={(e) => handleInputChange(colorKey, e.target.value)}
                    placeholder="e.g., 210 40% 98%"
                />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
    );
  };


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(settingsDocRef, settings, { merge: true });
      toast({
        title: 'Theme Saved!',
        description: 'Your new theme settings have been applied.',
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (error: any) {
      console.error("Error saving theme settings:", error);
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save theme settings.',
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
          <CardTitle>Theme Management</CardTitle>
          <CardDescription>Loading theme settings...</CardDescription>
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
          <CardTitle className="flex items-center"><Palette className="mr-2" />Site-wide Colors</CardTitle>
          <CardDescription>
            Customize the color palette. Changes will apply globally in real-time. Use HSL format for colors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-start gap-2 p-3 border border-blue-500/30 rounded-lg bg-blue-500/5 text-blue-700 dark:text-blue-300 text-sm">
                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                <p>Use the color picker for convenience, or manually enter HSL values (e.g., <code className="text-xs bg-blue-500/10 px-1 rounded">210 40% 98%</code>). HSL offers better control over theme variations.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ColorInput label="Primary Color" colorKey="primaryColor" hint="Buttons, active links, main accents." />
                <ColorInput label="Accent Color" colorKey="accentColor" hint="Secondary actions, highlights." />
                <ColorInput label="Secondary Color" colorKey="secondaryColor" hint="Secondary UI elements, badges." />
                <ColorInput label="Background" colorKey="backgroundColor" hint="Main page background." />
                <ColorInput label="Foreground / Text" colorKey="foregroundColor" hint="Main text color." />
                <ColorInput label="Card Background" colorKey="cardColor" hint="Background for cards, dialogs." />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Type className="mr-2" />Typography</CardTitle>
          <CardDescription>
            Select fonts for body text and headlines.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="fontBody">Body Font</Label>
                <Select value={settings.fontBody || ''} onValueChange={(value) => handleInputChange('fontBody', value)}>
                    <SelectTrigger id="fontBody"><SelectValue placeholder="Select body font" /></SelectTrigger>
                    <SelectContent>
                        {Object.entries(FONT_OPTIONS).map(([groupName, fonts]) => (
                            <Select.Group key={groupName}>
                                <Select.Label>{groupName}</Select.Label>
                                {fonts.map(font => <SelectItem key={font} value={font}>{font}</SelectItem>)}
                            </Select.Group>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="fontHeadline">Headline Font</Label>
                <Select value={settings.fontHeadline || ''} onValueChange={(value) => handleInputChange('fontHeadline', value)}>
                    <SelectTrigger id="fontHeadline"><SelectValue placeholder="Select headline font" /></SelectTrigger>
                    <SelectContent>
                         {Object.entries(FONT_OPTIONS).map(([groupName, fonts]) => (
                            <Select.Group key={groupName}>
                                <Select.Label>{groupName}</Select.Label>
                                {fonts.map(font => <SelectItem key={font} value={font}>{font}</SelectItem>)}
                            </Select.Group>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><List className="mr-2" />Layout</CardTitle>
          <CardDescription>
            Control layout settings like pagination.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div>
                <Label htmlFor="itemsPerPage">Posts Per Page</Label>
                <Input 
                    id="itemsPerPage" 
                    type="number" 
                    min="1" 
                    max="50"
                    value={settings.itemsPerPage || 9}
                    onChange={(e) => handleInputChange('itemsPerPage', parseInt(e.target.value, 10))}
                    className="max-w-xs"
                />
                 <p className="text-xs text-muted-foreground mt-1">Number of posts to show on the homepage before "Load More".</p>
            </div>
        </CardContent>
      </Card>
      
      <Button type="submit" disabled={isSaving || isLoading} size="lg" className="w-full sm:w-auto">
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save Theme Settings
      </Button>
    </form>
  );
}
