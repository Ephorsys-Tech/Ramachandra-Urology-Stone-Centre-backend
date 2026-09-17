import dotenv from "dotenv";
dotenv.config();
import { uploadFileToCloudinaryDetails } from "./util/uploadToCloudinary.js";

async function testBufferUpload() {
  console.log("=== Testing Multer Buffer File Upload to Cloudinary ===");
  
  // Create a 1x1 PNG file buffer
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

  const mockReqFile = {
    fieldname: "photo",
    originalname: "test_doctor_photo.png",
    encoding: "7bit",
    mimetype: "image/png",
    buffer: samplePngBuffer,
    size: samplePngBuffer.length
  };

  try {
    const result = await uploadFileToCloudinaryDetails(mockReqFile, "ramachandra-hospital/doctors");
    console.log("Buffer Upload Result:");
    console.log("secure_url (photo):", result.url);
    console.log("public_id (photoPublicId):", result.public_id);
    
    if (result && result.url && result.public_id) {
      console.log("TEST SUCCESS! Image link and public ID generated successfully.");
    } else {
      console.error("TEST FAILED! Missing url or public_id.");
    }
  } catch (err) {
    console.error("Buffer Upload Failed Error:", err);
  }
}

testBufferUpload();
