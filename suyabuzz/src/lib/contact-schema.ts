import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Please give us a little more detail'),
  // Honeypot: hidden from humans, irresistible to bots. Must stay empty.
  website: z.string().max(0, 'Rejected').optional().default(''),
})

export type ContactInput = z.infer<typeof contactSchema>
