import mongoose from "mongoose";

const validateDoctorData = (data) => {
  const {
    name,
    email,
    phone,
    specialization,
    experience,
    department,
  } = data;

  // ==================================================
  // Required Fields
  // ==================================================

  if (
    !name ||
    !email ||
    !phone ||
    !specialization ||
    experience === undefined ||
    !department
  ) {
    return "All fields are required";
  }

  if (!mongoose.Types.ObjectId.isValid(department)) {
    return "Invalid department ID";
  }

  // ==================================================
  // Name Validation
  // ==================================================

  if (name.length < 3 || name.length > 50) {
    return "Doctor name must be between 3 and 50 characters";
  }

  // ==================================================
  // Email Validation
  // ==================================================

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  // ==================================================
  // Phone Validation
  // ==================================================

  const phoneRegex = /^[0-9]{10}$/;

  if (!phoneRegex.test(phone)) {
    return "Phone number must be exactly 10 digits";
  }

  // ==================================================
  // Experience Validation
  // ==================================================

  if (
    isNaN(experience) ||
    experience < 0 ||
    experience > 60
  ) {
    return "Experience must be between 0 and 60 years";
  }

  return null;
};

export default validateDoctorData;