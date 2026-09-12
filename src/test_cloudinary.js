import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

async function testUpload() {
  try {
    console.log("Testing Cloudinary upload with cloud_name:", process.env.CLOUDINARY_NAME);
    const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const res = await cloudinary.uploader.upload(sampleBase64, {
      folder: "ramachandra-hospital/doctors",
    });
    console.log("SUCCESS! Cloudinary Upload Result:");
    console.log("secure_url:", res.secure_url);
    console.log("public_id:", res.public_id);
  } catch (err) {
    console.error("ERROR during Cloudinary upload:", err);
  }
}

testUpload();
