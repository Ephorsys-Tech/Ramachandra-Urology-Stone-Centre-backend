import dotenv from "dotenv";
dotenv.config();
import { uploadToCloudinaryDetails, uploadFileToCloudinaryDetails } from "./util/uploadToCloudinary.js";
import sanitizeDoctorData from "./util/sanitizeDoctorData.js";

async function testDoctorImageProcessing() {
  console.log("=== Testing Doctor Image Upload & Sanitization ===");

  // Test 1: JSON body with 'image' key
  const reqBody1 = {
    name: "Dr. Test Doctor",
    email: "dr.test@gmail.com",
    phone: "9999999999",
    specialization: "Urology",
    experience: 5,
    department: "6aa4fb48214add5c825ee400",
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  };

  const sanitized1 = sanitizeDoctorData(reqBody1);
  console.log("Sanitized Photo input key detected:", sanitized1.photo ? "YES" : "NO");

  if (sanitized1.photo) {
    const details = await uploadToCloudinaryDetails(sanitized1.photo, "ramachandra-hospital/doctors");
    console.log("Cloudinary details for Test 1:", details);
  }

  // Test 2: Remote URL image in 'picture' key
  const reqBody2 = {
    name: "Dr. Remote Test",
    picture: "https://via.placeholder.com/150"
  };
  const sanitized2 = sanitizeDoctorData(reqBody2);
  console.log("Sanitized Photo input key detected for picture field:", sanitized2.photo ? "YES" : "NO");

  if (sanitized2.photo) {
    const details2 = await uploadToCloudinaryDetails(sanitized2.photo, "ramachandra-hospital/doctors");
    console.log("Cloudinary details for Test 2:", details2);
  }

  console.log("=== All Tests Completed ===");
}

testDoctorImageProcessing();
