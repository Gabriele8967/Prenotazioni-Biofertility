// Rate limiting e sicurezza avanzata

const rateLimit = new Map<string, { count: number; resetTime: number; blocked: boolean }>();

// Cleanup automatico ogni 5 minuti
if (typeof window === 'undefined') {
  // Solo server-side
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimit.entries()) {
      if (now > value.resetTime && !value.blocked) {
        rateLimit.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(identifier);

  // Se bloccato permanentemente
  if (userLimit?.blocked) {
    return false;
  }

  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
      blocked: false,
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    // Blocca temporaneamente dopo troppi tentativi
    userLimit.resetTime = now + (windowMs * 2); // Raddoppia tempo ban
    return false;
  }

  userLimit.count++;
  return true;
}

// Rate limit specifico per login (anti brute-force)
export function checkLoginRateLimit(email: string, ip: string): boolean {
  const identifier = `login:${email}:${ip}`;
  return checkRateLimit(identifier, 5, 15 * 60 * 1000); // 5 tentativi / 15 min
}

// Rate limit per API booking (anti-spam)
export function checkBookingRateLimit(ip: string): boolean {
  return checkRateLimit(`booking:${ip}`, 3, 60 * 60 * 1000); // 3 prenotazioni / ora
}

// Rate limit per API generiche
export function checkAPIRateLimit(ip: string, endpoint: string): boolean {
  return checkRateLimit(`api:${endpoint}:${ip}`, 100, 60 * 1000); // 100 req / min
}

// Genera token CSRF sicuro
export function generateCSRFToken(): string {
  if (typeof window !== 'undefined') {
    // Client-side: usa crypto.getRandomValues
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Server-side: usa crypto di Node
    const cryptoNode = require('crypto');
    return cryptoNode.randomBytes(32).toString('hex');
  }
}

// Verifica token CSRF (timing-safe)
export function verifyCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  if (token.length !== storedToken.length) return false;

  if (typeof window === 'undefined') {
    // Server-side: usa timingSafeEqual
    const crypto = require('crypto');
    try {
      const tokenBuffer = Buffer.from(token, 'hex');
      const storedBuffer = Buffer.from(storedToken, 'hex');
      return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
    } catch {
      return false;
    }
  } else {
    // Client-side: confronto semplice (il server farà la verifica sicura)
    return token === storedToken;
  }
}

// Sanitize input per prevenire XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Rimuove < e >
    .replace(/javascript:/gi, '') // Rimuove javascript:
    .replace(/on\w+=/gi, '') // Rimuove event handlers (onclick, onerror, etc)
    .replace(/eval\(/gi, '') // Rimuove eval
    .replace(/<script/gi, '') // Rimuove script tags
    .trim()
    .slice(0, 1000); // Limita lunghezza max
}

// Sanitize HTML (più aggressivo)
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Rimuove script
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Rimuove iframe
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Rimuove event handlers
    .replace(/javascript:/gi, '')
    .trim();
}

// Verifica email valida (RFC 5322 semplificato)
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

export function validateEmail(email: string): boolean {
  return isValidEmail(email);
}

// Verifica telefono italiano
export function isValidItalianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  // Accetta: +39..., 0039..., 3..., numeri fissi italiani
  const phoneRegex = /^(\+39|0039)?[0-9]{6,13}$/;
  return phoneRegex.test(cleanPhone);
}

export function validatePhone(phone: string): boolean {
  return isValidItalianPhone(phone);
}

// Verifica codice fiscale italiano
export function isValidCodiceFiscale(cf: string): boolean {
  if (!cf || cf.length !== 16) return false;
  const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
  return cfRegex.test(cf);
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  isStrong: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Lunghezza
  if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
  } else {
    errors.push('La password deve contenere almeno 8 caratteri');
    suggestions.push('Usa almeno 12 caratteri per maggiore sicurezza');
  }

  // Minuscole
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    errors.push('Aggiungi almeno una lettera minuscola');
  }

  // Maiuscole
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    errors.push('Aggiungi almeno una lettera maiuscola');
  }

  // Numeri
  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    errors.push('Aggiungi almeno un numero');
  }

  // Caratteri speciali
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 20;
  } else {
    errors.push('Aggiungi almeno un carattere speciale (!@#$%^&*)');
  }

  // Varietà caratteri
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 10) {
    score += 10;
  }

  // Penalità per pattern comuni
  const commonPatterns = ['123', 'abc', 'password', 'admin', 'qwerty'];
  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      score -= 20;
      suggestions.push(`Evita pattern comuni come "${pattern}"`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    isStrong: errors.length === 0 && score >= 70,
    score,
    errors,
    suggestions,
  };
}

// Hash sicuro per firma digitale
export function generateSecureHash(data: string): string {
  if (typeof window !== 'undefined') {
    // Client-side: non fare hash (verrà fatto server-side)
    return data;
  } else {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Verifica integrità hash
export function verifyHash(data: string, hash: string): boolean {
  if (typeof window !== 'undefined') return false;
  const crypto = require('crypto');
  const computedHash = crypto.createHash('sha256').update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

// Estrae IP sicuro da headers
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

// Blocca IP sospetti (honeypot)
const blockedIPs = new Set<string>();

export function blockIP(ip: string, durationMs = 24 * 60 * 60 * 1000): void {
  blockedIPs.add(ip);
  setTimeout(() => blockedIPs.delete(ip), durationMs);
}

export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip);
}

// Log tentativi sospetti
export function logSuspiciousActivity(activity: {
  ip: string;
  endpoint: string;
  reason: string;
  timestamp: Date;
}): void {
  if (typeof window === 'undefined') {
    console.warn('🚨 SUSPICIOUS ACTIVITY:', activity);
    // In produzione, inviare a servizio di monitoring (Sentry, DataDog, etc)
  }
}
