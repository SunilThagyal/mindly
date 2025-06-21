import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PenSquare, Eye, Coins, HandCoins } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">How Mindly Works</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          We believe in rewarding creativity. Learn how your thoughts and stories can turn into tangible earnings on our platform.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <StepCard
          icon={<PenSquare className="h-10 w-10 text-accent" />}
          title="1. Write & Publish"
          description="Craft high-quality, engaging blog posts that people want to read. The better your content, the more views you'll attract. Use our intuitive editor to bring your ideas to life and publish them to the world."
        />
        <StepCard
          icon={<Eye className="h-10 w-10 text-accent" />}
          title="2. Get Views"
          description="Every time a user reads one of your published blog posts, your view count increases. Views are the primary metric for calculating your earnings. Share your posts on social media to maximize your reach."
        />
        <StepCard
          icon={<Coins className="h-10 w-10 text-accent" />}
          title="3. Earn Virtual Currency"
          description="For each view your post receives, you earn a set amount of virtual currency. The exact rate per view is determined by the site administrator and can be viewed on our earnings configuration page (for admins)."
        />
        <StepCard
          icon={<HandCoins className="h-10 w-10 text-accent" />}
          title="4. Request Withdrawal"
          description="Once your virtual earnings reach the minimum withdrawal threshold, you can request a payout. Go to your 'Monetization' page, ensure your payment details are correct, and submit a withdrawal request."
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

function StepCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="h-full shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        {icon}
        <CardTitle className="font-headline text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
