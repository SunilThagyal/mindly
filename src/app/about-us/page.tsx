
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `About ${siteConfig.name}`,
  description: `Learn more about ${siteConfig.name}, our mission, our values, and the team dedicated to empowering content creators around the world.`,
  alternates: {
    canonical: '/about-us',
  },
  openGraph: {
    title: `About ${siteConfig.name}`,
    description: `Learn more about our mission to empower content creators.`,
    url: '/about-us',
    images: [
      {
        url: `${siteConfig.url}/default-og-image.png`,
        width: 1200,
        height: 630,
        alt: `About ${siteConfig.name}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `About ${siteConfig.name}`,
    description: `Learn more about our mission to empower content creators.`,
    images: [`${siteConfig.url}/default-og-image.png`],
  },
};

export default function AboutUsPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-16">
      <header className="text-center">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4">About {siteConfig.name}</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          We are on a mission to build a more open, rewarding, and creator-centric digital world.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-headline font-bold text-foreground">Our Story</h2>
          <p className="text-muted-foreground leading-relaxed">
            Founded on the principle that creators are the lifeblood of the internet, {siteConfig.name} was born from a desire to challenge the status quo. We saw a digital landscape where content creators were often undervalued, their hard work benefiting platforms more than themselves.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We envisioned a new kind of platform: one that is decentralized, transparent, and puts creators first. A place where your words have value, your ownership is respected, and your success is celebrated by a global community. That vision is {siteConfig.name}.
          </p>
        </div>
        <div>
            <Image 
                src="https://placehold.co/600x400.png"
                alt="A diverse group of people collaborating"
                width={600}
                height={400}
                className="rounded-lg shadow-xl"
                data-ai-hint="collaboration team"
            />
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-headline font-bold text-foreground mb-10">Our Core Values</h2>
        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8">
          <ValueCard
            icon={<BookOpen className="h-10 w-10 text-accent" />}
            title="Empower Creators"
            description="We provide the tools and platform for creators to own their content, build their audience, and earn rewards for their work."
          />
          <ValueCard
            icon={<Target className="h-10 w-10 text-accent" />}
            title="Foster Community"
            description="We believe in the power of connection. Our platform is designed to encourage meaningful discussion and collaboration."
          />
          <ValueCard
            icon={<Users className="h-10 w-10 text-accent" />}
            title="Champion Transparency"
            description="From content moderation to monetization, we are committed to building a transparent and fair ecosystem for everyone."
          />
        </div>
      </section>
      
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="h-full shadow-lg hover:shadow-xl transition-shadow text-center">
      <CardHeader className="flex flex-col items-center gap-4">
        {icon}
        <CardTitle className="font-headline text-2xl text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
