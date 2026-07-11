const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const indianPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid phone number format — must start with 6-9 and be exactly 10 digits');

const loanImportSchema = z
  .object({
    number: z.number().int().positive().optional(), // manual loan number from physical ledger
    mode: z.enum(['daily', 'principal']),
    dailyAmount: z.number().positive().optional(),
    principalAmount: z.number().positive().optional(),
    interestRate: z.number().min(0).default(12).optional(),
    totalDays: z.number().int().positive().default(50),
    startDate: z.coerce.date(),
    openingPendingBalance: z.number().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'daily' && data.dailyAmount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyAmount'],
        message: 'dailyAmount is required when mode is "daily"',
      });
    }
    if (data.mode === 'principal' && data.principalAmount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalAmount'],
        message: 'principalAmount is required when mode is "principal"',
      });
    }
  });

const customerImportSchema = z.object({
  name: z.string().min(1, 'name is required'),
  phone: indianPhone,
  groupId: objectId,
  loan: loanImportSchema.nullable().optional(),
});

const bulkImportSchema = z.object({
  customers: z
    .array(customerImportSchema)
    .min(1, 'At least one customer is required')
    .max(200, 'Maximum 200 customers per import. Split into multiple requests.'),
});

module.exports = { bulkImportSchema };
