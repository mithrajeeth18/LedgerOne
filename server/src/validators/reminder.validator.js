const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const reminderSchema = z.object({
  loanId: objectId,
  customerId: objectId,
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  repeatType: z.enum(['once', 'daily']),
  reminderDate: z.coerce.date().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.repeatType === 'once') {
    if (!data.reminderDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reminderDate'], message: 'reminderDate is required' });
      return;
    }
    if (data.reminderDate <= new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reminderDate'], message: 'reminderDate must be in the future' });
    }
  }
});

module.exports = { reminderSchema };
