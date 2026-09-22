import mongoose from "mongoose";

const validateServiceData = (data) => {
  const {
    name,
    shortDescription,
    description,
    features,
    faqs,
  } = data;

  // ==================================================
  // Required Fields
  // ==================================================
  if (!name || !name.trim()) {
    return "Service name is required";
  }

  if (name.trim().length < 2 || name.trim().length > 100) {
    return "Service name must be between 2 and 100 characters";
  }

  if (!shortDescription || !shortDescription.trim()) {
    return "Short description is required";
  }

  if (!description || !description.trim()) {
    return "Full description is required";
  }

  // ==================================================
  // Features Validation
  // ==================================================
  if (features && Array.isArray(features)) {
    const invalidIds = features.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return "One or more feature IDs are invalid";
    }
  }

  // ==================================================
  // FAQs Validation
  // ==================================================
  if (faqs && Array.isArray(faqs)) {
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i];
      if (!faq.question || !faq.question.trim()) {
        return `FAQ #${i + 1} is missing a question`;
      }
      if (!faq.answer || !faq.answer.trim()) {
        return `FAQ #${i + 1} is missing an answer`;
      }
    }
  }

  return null;
};

export default validateServiceData;
