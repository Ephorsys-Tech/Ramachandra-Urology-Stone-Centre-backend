const sanitizeDoctorData = (data = {}) => {
  const sanitizeString = (str) => {
    if (typeof str !== "string") return undefined;
    const trimmed = str.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const sanitizeArray = (val) => {
    if (val === undefined || val === null) return undefined;
    if (Array.isArray(val)) {
      return val.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch (e) {
        // Not JSON, treat as newline separated list
      }
      return trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    }
    return undefined;
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
    description: sanitizeString(data.description) || sanitizeString(data.about),
    about: sanitizeString(data.about) || sanitizeString(data.description),
    expertise: sanitizeArray(data.expertise || data.fieldOfExpertise),
    publications: sanitizeArray(data.publications || data.researchAndPublications),
    certifications: sanitizeArray(data.certifications || data.certificationAndMemberships),
    languages: sanitizeString(data.languages),
    timing: sanitizeString(data.timing),
    isAvailable: data.isAvailable === "true" || data.isAvailable === true,
  };
};

export default sanitizeDoctorData;
