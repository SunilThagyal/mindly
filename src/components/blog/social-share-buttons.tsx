
"use client";

import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Mail, Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// A simple inline SVG component for the WhatsApp icon
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.4 5.6c-1.8-1.8-4.1-2.8-6.6-2.8-5.2 0-9.4 4.2-9.4 9.4 0 1.7.4 3.3 1.3 4.8l-1.4 5.1 5.2-1.4c1.5.8 3.1 1.2 4.8 1.2h.1c5.2 0 9.4-4.2 9.4-9.4.1-2.5-1-4.9-2.8-6.7zm-6.6 15.1h-.1c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3c-.8-1.3-1.2-2.8-1.2-4.4 0-4.2 3.4-7.6 7.6-7.6 2.1 0 4 .8 5.4 2.2s2.2 3.3 2.2 5.4c-.1 4.2-3.5 7.6-7.7 7.6z m4.3-5.2c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.7-.8.9-.1.1-.3.2-.5.1s-.4-.1-.8-.3c-.8-.4-1.5-1-2.2-1.7-.5-.5-1-1.2-1.1-1.4-.1-.2 0-.4.1-.5.1-.1.2-.2.4-.4.1-.1.2-.2.3-.4.1-.1.1-.3 0-.4-.1-.1-1.6-3.8-1.8-4.2-.2-.4-.4-.3-.6-.3h-.3c-.2 0-.5.1-.7.3-.2.3-.8.8-.8 2 0 1.2.8 2.3 1 2.5s1.6 2.5 4 3.5c.5.2 1 .3 1.3.4.5.1 1-.1 1.3-.3.4-.2.6-.7.8-.9.1-.2.1-.4 0-.5z"/>
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
