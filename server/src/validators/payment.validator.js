const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const paymentSchema = z.object({
  loanId: objectId,
  paymentDate: z.coerce.date(),
  paidAmount: z.number().min(0),
  paymentMode: z.enum(['cash', 'online']),
  isOfflineEntry: z.boolean().default(false).optional(),
});

const updatePaymentSchema = z.object({
  paidAmount: z.number().min(0),
  paymentMode: z.enum(['cash', 'online']),
});

const syncPaymentSchema = z.object({
  payments: z.array(paymentSchema).default([]),
});

module.exports = { paymentSchema, updatePaymentSchema, syncPaymentSchema };
