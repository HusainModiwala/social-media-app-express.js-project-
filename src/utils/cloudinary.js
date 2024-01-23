import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
  try {
    if(!localFilePath || !fs.existsSync) return null;

    // upload to cloudinary
    const response = await cloudinary.uploader.upload(
      localFilePath,
      {resource_type: "auto"},
    )

    console.log("Response from cloudinary ", response);
    fs.unlinkSync(localFilePath); //unlink locally saved file.

    return response;
  }
  catch (error) {
    console.error("An error occured while uploading file to cloudinary ", error.message);
    fs.unlinkSync(localFilePath); //unlink locally saved file.
    return null;
  }
};

const deleteFileFromCloudinary = async (public_id) => {
  try {
    if(!public_id) return null;

    const response = await cloudinary.uploader.destroy(public_id, {resource_type: 'image'});
    console.log("Response from cloudinary ", response);
    
    return response;
  } catch (error) {
    console.error("An error occured while deleting file from cloudinary ", error.message);
    return null;
  }
}

export { uploadFileOnCloudinary, deleteFileFromCloudinary };