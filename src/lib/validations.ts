import { z } from 'zod';

// User validation schema
export const userSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must be less than 100 characters' }),
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  phone: z.string()
    .trim()
    .max(20, { message: 'Phone must be less than 20 characters' })
    .optional()
    .or(z.literal('')),
  address: z.string()
    .trim()
    .max(255, { message: 'Address must be less than 255 characters' })
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'manager', 'cleaner']),
  isActive: z.boolean(),
});

export type UserSchema = z.infer<typeof userSchema>;

// Client validation schema
export const clientSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must be less than 100 characters' }),
  type: z.enum(['residential', 'commercial']),
  address: z.string()
    .trim()
    .min(5, { message: 'Address must be at least 5 characters' })
    .max(255, { message: 'Address must be less than 255 characters' }),
  contactPerson: z.string()
    .trim()
    .max(100, { message: 'Contact name must be less than 100 characters' })
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .trim()
    .min(10, { message: 'Phone must be at least 10 characters' })
    .max(20, { message: 'Phone must be less than 20 characters' }),
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  notes: z.string()
    .trim()
    .max(1000, { message: 'Notes must be less than 1000 characters' })
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

export type ClientSchema = z.infer<typeof clientSchema>;

// Contract validation schema
export const contractSchema = z.object({
  clientId: z.string().min(1, { message: 'Client is required' }),
  status: z.enum(['draft', 'pending', 'active', 'completed', 'cancelled']),
  type: z.enum(['recurring', 'one-time']),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().optional().or(z.literal('')),
  hoursPerWeek: z.number().min(1).max(168),
  hourlyRate: z.number().min(0),
  billingFrequency: z.enum(['weekly', 'biweekly', 'monthly']),
  cleaningScope: z.string()
    .trim()
    .max(2000, { message: 'Cleaning scope must be less than 2000 characters' })
    .optional()
    .or(z.literal('')),
  specialNotes: z.string()
    .trim()
    .max(1000, { message: 'Notes must be less than 1000 characters' })
    .optional()
    .or(z.literal('')),
});

export type ContractSchema = z.infer<typeof contractSchema>;

// Job validation schema
export const jobSchema = z.object({
  clientId: z.string().min(1, { message: 'Client is required' }),
  employeeId: z.string().min(1, { message: 'Employee is required' }),
  date: z.string().min(1, { message: 'Date is required' }),
  time: z.string().min(1, { message: 'Time is required' }),
  duration: z.string().min(1, { message: 'Duration is required' }),
  services: z.array(z.string()).min(1, { message: 'At least one service is required' }),
  notes: z.string()
    .trim()
    .max(500, { message: 'Notes must be less than 500 characters' })
    .optional()
    .or(z.literal('')),
});

export type JobSchema = z.infer<typeof jobSchema>;

// Estimate validation schema
export const estimateSchema = z.object({
  clientName: z.string()
    .trim()
    .min(2, { message: 'Client name must be at least 2 characters' })
    .max(100, { message: 'Client name must be less than 100 characters' }),
  clientEmail: z.string()
    .trim()
    .email({ message: 'Invalid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  clientPhone: z.string()
    .trim()
    .min(10, { message: 'Phone must be at least 10 characters' })
    .max(20, { message: 'Phone must be less than 20 characters' }),
  serviceType: z.enum(['standard', 'deep', 'moveOut', 'commercial']),
  frequency: z.enum(['oneTime', 'monthly', 'biweekly', 'weekly']),
  squareFootage: z.number().min(100).max(100000),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  hourlyRate: z.number().min(0),
});

export type EstimateSchema = z.infer<typeof estimateSchema>;

// Absence request validation schema
export const absenceRequestSchema = z.object({
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().min(1, { message: 'End date is required' }),
  reason: z.string()
    .trim()
    .min(10, { message: 'Reason must be at least 10 characters' })
    .max(500, { message: 'Reason must be less than 500 characters' }),
});

export type AbsenceRequestSchema = z.infer<typeof absenceRequestSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address' }),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters' }),
  remember: z.boolean().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// Helper function to validate form data
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return { success: false, errors };
}
