
"use client";

import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Mail, Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// A simple inline SVG component for the WhatsApp icon
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-1.04-.01-1.04 0-.523.119-.523.579 0 .429.082.851.082.851l.001.001.001.001c.001.001.046.125.092.231.28.666 1.608 2.857 3.998 4.718 2.388 1.858 2.981 2.25 3.612 2.448.63.198 1.13.165 1.54.105.441-.061 1.341-.557 1.53-1.074.19-.517.19-1 .12-1.124-.07-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.815 11.815 0 005.785 1.493h.004c6.554 0 11.88-5.335 11.883-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

interface SocialShareButtonsProps {
  blogUrl: string;
  blogTitle: string;
}

export default function SocialShareButtons({ blogUrl, blogTitle }: SocialShareButtonsProps) {
  const { toast } = useToast();
  const [canShare, setCanShare] = useState(false);
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${blogUrl}` : blogUrl;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        toast({ title: "Link Copied!", description: "Blog post URL copied to clipboard.", variant: 'success' });
      })
      .catch(err => {
        console.error("Failed to copy link: ", err);
        toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
      });
  };

  const handleWebShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: blogTitle,
                text: `Check out this blog post: "${blogTitle}"`,
                url: fullUrl,
            });
        } catch (error) {
            console.error('Error using Web Share API:', error);
            // This error typically happens if the user cancels the share dialog, so we don't need to show a toast.
        }
    } else {
        toast({ title: "Not Supported", description: "Web Share is not supported by your browser.", variant: 'destructive' });
    }
  };

  const shareOptions = [
    {
      name: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    },
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="h-5 w-5" />,
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(blogTitle + " " + fullUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-5 w-5" />,
      url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(blogTitle)}`,
    },
    {
      name: "Email",
      icon: <Mail className="h-5 w-5" />,
      url: `mailto:?subject=${encodeURIComponent(blogTitle)}&body=Check out this blog post: ${encodeURIComponent(fullUrl)}`,
    },
  ];

  return (
    <div className="mt-8 pt-6 border-t">
      <h3 className="text-lg font-semibold mb-3 text-foreground">Share this post:</h3>
      <div className="flex flex-wrap gap-2">
        {shareOptions.map(option => (
          <Button
            key={option.name}
            variant="outline"
            size="icon"
            asChild
            title={`Share on ${option.name}`}
            className="rounded-full"
          >
            <a href={option.url} target="_blank" rel="noopener noreferrer">
              {option.icon}
            </a>
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          onClick={copyLink}
          title="Copy link"
          className="rounded-full"
        >
          <LinkIcon className="h-5 w-5" />
        </Button>
        {canShare && (
             <Button
                variant="outline"
                size="icon"
                onClick={handleWebShare}
                title="More options"
                className="rounded-full"
            >
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        )}
      </div>
    </div>
  );
}
