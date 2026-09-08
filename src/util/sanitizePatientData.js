const sanitizePatientData = (data = {}) => {
  const sanitizeString = (str) => {
    if (typeof str !== "string") return undefined;
    const trimmed = str.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  return {
    name: sanitizeString(data.name),
    age: data.age !== undefined && data.age !== "" ? Number(data.age) : undefined,
    gender: sanitizeString(data.gender),
    phone: sanitizeString(data.phone),
    bloodGroup: sanitizeString(data.bloodGroup),
    email: sanitizeString(data.email)?.toLowerCase(),
    address: sanitizeString(data.address),
    doctor: sanitizeString(data.doctor),
    department: sanitizeString(data.department),
    status: sanitizeString(data.status),
    source: sanitizeString(data.source),
    history: Array.isArray(data.history) ? data.history : undefined,
    appointmentDate: data.appointmentDate === null || data.appointmentDate === "null" || data.appointmentDate === "" ? null : (data.appointmentDate ? new Date(data.appointmentDate) : undefined),
    appointmentTime: data.appointmentTime === null || data.appointmentTime === "null" || data.appointmentTime === "" ? null : sanitizeString(data.appointmentTime),
  };
};

export default sanitizePatientData;
