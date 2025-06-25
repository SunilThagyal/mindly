
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PenSquare, Eye, ShieldCheck, HandCoins } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'How It Works - Turn Views Into Earnings',
  description: `Learn how ${siteConfig.name} rewards creativity. Follow our simple steps to publish content, get views, become eligible for monetization, and earn from your blog posts.`,
  alternates: {
    canonical: '/how-it-works',
  },
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">How {siteConfig.name} Works</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          We believe in rewarding creativity. Learn how to meet the eligibility criteria and turn your engaging stories into tangible earnings.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <StepCard
          icon={<PenSquare className="h-10 w-10 text-accent" />}
          title="1. Write & Publish"
          description={
            <>
              Craft <a href="https://www.semrush.com/blog/how-to-write-a-blog-post/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">high-quality, engaging blog posts</a> that people want to read. Use our intuitive <Link href="/blog/create" className="text-primary hover:underline">editor</Link> to bring your ideas to life and publish them to the world.
            </>
          }
        />
        <StepCard
          icon={<Eye className="h-10 w-10 text-accent" />}
          title="2. Get Views"
          description="Every time a user reads one of your published blog posts, your view count increases. Views are the primary metric for calculating your earnings. Share your posts on social media to maximize your reach."
        />
        <StepCard
          icon={<ShieldCheck className="h-10 w-10 text-accent" />}
          title="3. Become Eligible for Monetization"
          description="Before you can earn, your account must be approved. To qualify, you need to publish at least 10 high-quality posts and achieve a combined total of at least 500 views across all your published posts. This ensures a standard of quality on the platform."
        />
        <StepCard
          icon={<HandCoins className="h-10 w-10 text-accent" />}
          title="4. Earn & Withdraw"
          description={
            <>
              Once approved, you'll earn virtual currency for your post views based on admin-set rates. When your balance reaches the minimum threshold, request a withdrawal from your <Link href="/monetization" className="text-primary hover:underline">monetization dashboard</Link>.
            </>
          }
        />
      </div>

      <div className="text-center mt-12">
        <Button asChild size="lg">
          <Link href="/blog/create">Start Writing Now</Link>
        </Button>
      </div>
    </div>
  );
}

function StepCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: React.ReactNode }) {
  return (
    <Card className="h-full shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        {icon}
        <h2 className="font-headline text-2xl text-card-foreground">{title}</h2>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}
