const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const loanSchema = z.object({
  customerId: objectId,
  groupId: objectId,
  mode: z.enum(['daily', 'principal']),
  dailyAmount: z.number().positive().optional(),
  principalAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).default(12).optional(),
  totalDays: z.number().int().positive().default(50),
  startDate: z.coerce.date(),
}).superRefine((data, ctx) => {
  if (data.mode === 'daily' && data.dailyAmount === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dailyAmount'], message: 'dailyAmount is required' });
  }
  if (data.mode === 'principal' && data.principalAmount === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['principalAmount'], message: 'principalAmount is required' });
  }
});

const rolloverSchema = z.object({
  newAmount: z.number().positive(),
  interestRate: z.number().min(0).default(12).optional(),
  totalDays: z.number().int().positive().default(50),
  startDate: z.coerce.date(),
});

module.exports = { loanSchema, rolloverSchema };
