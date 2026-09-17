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
    photo:
      sanitizeString(data.photo) ||
      sanitizeString(data.image) ||
      sanitizeString(data.file) ||
      sanitizeString(data.avatar) ||
      sanitizeString(data.picture) ||
      sanitizeString(data.img) ||
      sanitizeString(data.doctorImage) ||
      sanitizeString(data.photoUrl) ||
      sanitizeString(data.imageUrl) ||
      sanitizeString(data.image_url),
    photoPublicId:
      sanitizeString(data.photoPublicId) ||
      sanitizeString(data.public_id) ||
      sanitizeString(data.publicId) ||
      sanitizeString(data.imagePublicId),
    qualifications: sanitizeString(data.qualifications),
    description: sanitizeString(data.description),
    languages: sanitizeString(data.languages),
    timing: sanitizeString(data.timing),
    isAvailable: data.isAvailable === "true" || data.isAvailable === true,
  };
};

export default sanitizeDoctorData;
