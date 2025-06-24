
"use client";

import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Linkedin, Mail, Link as LinkIcon } from "lucide-react"; // Renamed Link to LinkIcon
import { useToast } from "@/hooks/use-toast";

interface SocialShareButtonsProps {
  blogUrl: string;
  blogTitle: string;
}

export default function SocialShareButtons({ blogUrl, blogTitle }: SocialShareButtonsProps) {
  const { toast } = useToast();
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${blogUrl}` : blogUrl;

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

  const shareOptions = [
    {
      name: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    },
    {
      name: "Twitter",
      icon: <Twitter className="h-5 w-5" />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(blogTitle)}`,
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
      </div>
    </div>
  );
}
