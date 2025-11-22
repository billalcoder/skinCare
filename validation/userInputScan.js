import { z } from 'zod';
import xss from 'xss';

// --- 1. Setup Enums (matching your Mongoose model) ---
const GenderEnum = ['male', 'female', 'other'];
const SkinTypeEnum = ['oily', 'dry', 'combination', 'normal', 'sensitive'];
const ConcernsEnum = [
  'pigmentation', 'acne', 'wrinkles', 'dark_spots', 'redness',
  'dryness', 'oiliness', 'pores', 'dark_circles'
];

// --- 2. XSS Sanitization Helper ---
// This function strips malicious scripts (e.g., <script>alert('hack')</script>)
const sanitize = (val) => xss(val).trim();

// --- 3. The Zod Schema ---
export const userRegistrationSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .transform(sanitize), // Auto-sanitize input

  email: z.string()
    .email("Invalid email format")
    .toLowerCase()
    .transform(sanitize),

  age: z.number()
    .int()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),

  gender: z.enum(GenderEnum, {
    errorMap: () => ({ message: "Gender must be male, female, or other" })
  }),

  skinType: z.enum(SkinTypeEnum, {
    errorMap: () => ({ message: "Invalid skin type selected" })
  }),

  // Arrays require specific validation for items inside
  allergies: z.array(
    z.string().transform(sanitize)
  ).optional().default([]),

  concerns: z.array(
    z.enum(ConcernsEnum)
  ).optional().default([]),

  // NOTE: fields like 'otp' and 'isVerified' are EXCLUDED here.
  // Security Best Practice: Never allow the user to send these fields directly.
});
