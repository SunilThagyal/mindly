/**
 * Optimizes a Cloudinary URL by adding f_auto and q_auto transformations.
 * If the URL is not a Cloudinary URL or is null/undefined, it returns a placeholder or the original URL.
 * @param url The image URL to optimize.
 * @returns The optimized URL or a placeholder.
 */
export const optimizeCloudinaryImage = (url: string | null | undefined): string => {
  if (!url) {
    return `https://placehold.co/600x400.png`;
  }

  // Don't optimize placeholders or non-cloudinary images
  if (url.includes('placehold.co') || !url.includes('res.cloudinary.com')) {
    return url;
  }
  
  const uploadMarker = '/image/upload/';
  const transformation = 'f_auto,q_auto';

  if(url.includes(uploadMarker) && !url.includes(transformation)) {
     return url.replace(uploadMarker, `${uploadMarker}${transformation}/`);
  }

  return url;
};
