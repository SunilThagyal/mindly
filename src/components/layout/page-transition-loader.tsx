
'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

const PageTransitionLoader = () => {
  // The primary color from the theme is hsl(48 100% 50%), which is #FFD700 (Gold)
  const primaryColor = '#FFD700';

  return (
    <ProgressBar
      height="4px"
      color={primaryColor}
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
};

export default PageTransitionLoader;
