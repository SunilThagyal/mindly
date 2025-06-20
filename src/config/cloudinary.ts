
// src/config/cloudinary.ts
export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (typeof window !== 'undefined') { // Only run this warning logic in the browser
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset' || CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_upload_preset_name') {
    const isMissingCloudName = !CLOUDINARY_CLOUD_NAME;
    const isPlaceholderPreset = !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset' || CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_upload_preset_name';

    let warningMessage = "**********************************************************************************************************************************************************************************\n" +
      "WARNING: Cloudinary is not fully configured for image uploads.\n";

    if (isMissingCloudName) {
      warningMessage += "- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable is not set.\n";
    }
    if (isPlaceholderPreset) {
      warningMessage += `- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variable is not set or is using a placeholder value (e.g., 'blogchain_unsigned_preset' or 'your_unsigned_upload_preset_name').\n`;
    }

    warningMessage += "\nImage uploads within the blog editor (both cover image and in-content images) will NOT work until these are correctly configured in your .env file (e.g., .env.local).\n" +
      "You need to create an 'unsigned' upload preset in your Cloudinary dashboard (Media Library -> Settings (gear icon) -> Upload -> Upload presets -> Add upload preset).\n" +
      "The preset should ideally be named 'blogchain_unsigned_preset' to match the placeholder, or you must update NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file to your chosen preset name.\n" +
      `Then, update your .env file. Your Cloudinary Cloud Name is already set to: ${CLOUDINARY_CLOUD_NAME || 'your_cloud_name'}\n` +
      `Example for preset in .env: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_actual_unsigned_upload_preset_name\n\n` +
      "The Cloudinary API Key and Secret you might have are for server-side operations and should NOT be used directly in the frontend client-side code for security reasons.\n" +
      "**********************************************************************************************************************************************************************************";
    
    console.warn(warningMessage);
  }
}
