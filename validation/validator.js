import { z } from 'zod';
import xss from 'xss';
import mongoose from 'mongoose';

// --- 1. Shared Helpers ---

// XSS Sanitizer: Removes <script> tags and other malicious HTML
const sanitize = (val) => xss(val, { stripIgnoreTag: true, stripIgnoreTagBody: ["script"] }).trim();

// MongoDB ObjectId Validator
// Ensures the string is a valid 24-character hex string
const objectIdValidator = z.string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid MongoDB ObjectId"
    });

// --- 2. History Model Validation ---

const SuitabilityEnum = ['excellent', 'good', 'moderate', 'poor', 'unsuitable'];

export const historyValidationSchema = z.object({
    // Often userId is injected by middleware (req.user.id), so we make it optional in the 
    // input schema. If you pass it manually, un-comment the .optional()
    userId: objectIdValidator.optional(),

    extractedText: z.string()
        .min(1, "Extracted text cannot be empty")
        .transform(sanitize), // Critical: sanitize OCR/User text input

    productAnalysis: z.string()
        .min(1, "Analysis result is required")
        .transform(sanitize),

    // aiResponse is an Object. We allow any structure but ensure it's an object.
    // We don't sanitize this deeply as it's usually machine-generated JSON.
    aiResponse: z.record(z.string(), z.unknown()).or(z.object({}).loose()),

    metadata: z.object({
        ingredients: z.array(
            z.string().transform(sanitize)
        ).default([]),

        productType: z.string().optional().transform((val) => val ? sanitize(val) : val),

        brand: z.string().optional().transform((val) => val ? sanitize(val) : val),

        rating: z.number()
            .min(1, "Rating must be at least 1")
            .max(5, "Rating cannot exceed 5")
            .optional(),

        suitability: z.enum(SuitabilityEnum, {
            errorMap: () => ({ message: "Suitability must be one of: excellent, good, moderate, poor, unsuitable" })
        })
    })
});

// --- 3. Session Model Validation ---

export const sessionValidationSchema = z.object({
    userId: objectIdValidator,

    token: z.string()
        .min(10, "Token is too short")
        // No sanitization needed for tokens usually, but strictly checking format is good
        .regex(/^[A-Za-z0-9\-_.]+$/, "Invalid token format"),

    // Zod can validate Date objects or date strings
    expiresAt: z.coerce.date()
        .refine((date) => date > new Date(), {
            message: "Expiration date must be in the future"
        }),

    userAgent: z.string()
        .optional()
        .transform((val) => val ? sanitize(val) : val), // Sanitize user agent! Common attack vector.

    ipAddress: z.string()
        .ip({ version: "v4", message: "Invalid IPv4 address" })
        .or(z.string().ip({ version: "v6", message: "Invalid IPv6 address" }))
        .optional()
});