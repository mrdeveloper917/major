export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (value = "") => emailRegex.test(String(value).trim());

export const validatePhone = (value = "") => {
  const normalized = String(value).replace(/\D/g, "");
  return normalized.length >= 10 && normalized.length <= 15;
};

export const getPasswordStrength = (value = "") => {
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value.length) {
    return { score: 0, label: "Add a stronger password", color: "#475569" };
  }

  if (score <= 2) {
    return { score, label: "Weak", color: "#EF4444" };
  }

  if (score <= 4) {
    return { score, label: "Medium", color: "#F59E0B" };
  }

  return { score, label: "Strong", color: "#22C55E" };
};
