import mongoose from "mongoose";

const validatePatientData = (data) => {
  const { name, age, gender, phone, bloodGroup, email, doctor, department, status } = data;

  if (!name || age === undefined || !gender || !phone || !doctor || !department) {
    return "Name, age, gender, phone, doctor, and department are required";
  }

  if (!mongoose.Types.ObjectId.isValid(doctor)) {
    return "Invalid doctor ID";
  }

  if (!mongoose.Types.ObjectId.isValid(department)) {
    return "Invalid department ID";
  }

  if (name.length < 3 || name.length > 100) {
    return "Patient name must be between 3 and 100 characters";
  }

  if (typeof age !== "number" || isNaN(age) || age < 0 || age > 150) {
    return "Patient age must be a number between 0 and 150";
  }

  const allowedGenders = ["Male", "Female", "Other"];
  if (!allowedGenders.includes(gender)) {
    return "Gender must be Male, Female, or Other";
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return "Phone number must be exactly 10 digits";
  }

  const allowedBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-","Unknown"];
  if (bloodGroup && !allowedBloodGroups.includes(bloodGroup)) {
    return "Invalid blood group";
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Invalid email format";
    }
  }

  if (status) {
    const allowedStatus = [
      "Admitted",
      "Outpatient",
      "Emergency",
      "Recovery",
      "In Treatment",
      "Discharged",
    ];
    if (!allowedStatus.includes(status)) {
      return "Status must be Admitted, Outpatient, Emergency, Recovery, In Treatment, or Discharged";
    }
  }

  if (data.source) {
    const allowedSources = ["Organic", "Online"];
    if (!allowedSources.includes(data.source)) {
      return "Source must be Organic or Online";
    }
  }

  return null;
};

export default validatePatientData;
