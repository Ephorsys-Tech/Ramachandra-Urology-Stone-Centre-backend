const sanitizeDoctorData = (data = {}) => {
  const sanitizeString = (str) => {
    if (typeof str !== "string") return undefined;
    const trimmed = str.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  return {
    name: sanitizeString(data.name),
    email: sanitizeString(data.email)?.toLowerCase(),
    phone: sanitizeString(data.phone),
    specialization: sanitizeString(data.specialization),
    experience: data.experience !== undefined && data.experience !== "" ? Number(data.experience) : undefined,
    department: sanitizeString(data.department),
    photo: sanitizeString(data.photo),
    qualifications: sanitizeString(data.qualifications),
    description: sanitizeString(data.description),
    languages: sanitizeString(data.languages),
    timing: sanitizeString(data.timing),
    isAvailable: data.isAvailable === "true" || data.isAvailable === true,
  };
};

export default sanitizeDoctorData;
