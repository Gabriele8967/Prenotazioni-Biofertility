// Rate limiting e sicurezza

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 500); // Limita lunghezza
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[0-9\s-]{10,15}$/;
  return phoneRegex.test(phone);
}
