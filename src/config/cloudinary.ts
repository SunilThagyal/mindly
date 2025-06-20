
// src/config/cloudinary.ts
export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (typeof window !== 'undefined') { // Only run this warning logic in the browser
  const isCloudNameMissing = !CLOUDINARY_CLOUD_NAME;
  const isPresetMissingOrPlaceholder = !CLOUDINARY_UPLOAD_PRESET || 
                                     CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset' || 
                                     CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_upload_preset_name';

  if (isCloudNameMissing || isPresetMissingOrPlaceholder) {
    let warningMessage = "**********************************************************************************************************************************************************************************\n" +
      "WARNING: Cloudinary is not fully configured for image/video uploads via the editor.\n";

    if (isCloudNameMissing) {
      warningMessage += `- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable is not set. Current value: '${CLOUDINARY_CLOUD_NAME}'.\n`;
    }
    if (isPresetMissingOrPlaceholder) {
      warningMessage += `- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variable is not set or is using a placeholder value. Current value: '${CLOUDINARY_UPLOAD_PRESET}'.\n`;
    }

    warningMessage += "\nMedia uploads within the blog editor (cover image, in-content images, and in-content videos) will NOT work until these are correctly configured in your .env file (e.g., .env.local).\n" +
      "1. Ensure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set to your Cloudinary cloud name.\n" +
      "2. Create an 'unsigned' upload preset in your Cloudinary dashboard (Media Library -> Settings (gear icon) -> Upload -> Upload presets -> Add upload preset).\n" +
      "3. Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file to your chosen unsigned preset name (e.g., 'blogchain_unsigned_preset' or 'your_actual_unsigned_preset_name').\n\n" +
      `Your Cloudinary Cloud Name is currently: ${CLOUDINARY_CLOUD_NAME || 'NOT SET'}\n` +
      `Your Cloudinary Upload Preset is currently: ${CLOUDINARY_UPLOAD_PRESET || 'NOT SET'}\n\n` +
      "The Cloudinary API Key and Secret are for server-side operations and should NOT be used directly in the frontend.\n" +
      "**********************************************************************************************************************************************************************************";
    
    console.warn(warningMessage);
  }
}
