import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(10, "At least 10 characters"),
  shopName: z.string().trim().min(2, "Shop name is required").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const resetCompleteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, "At least 10 characters"),
});

export const onboardingSchema = z.object({
  address: z.string().trim().max(200).optional().or(z.literal("")),
  ntn: z.string().trim().max(20).optional().or(z.literal("")),
  gst: z.string().trim().max(20).optional().or(z.literal("")),
  fbrRegistered: z.enum(["yes", "no"]),
  openingCash: z.coerce.number().int().nonnegative().default(0),
  openingBank: z.coerce.number().int().nonnegative().default(0),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
