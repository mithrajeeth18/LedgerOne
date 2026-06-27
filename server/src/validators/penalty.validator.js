const { z } = require('zod');

const penaltySchema = z.object({
  loanId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  amount: z.number().min(0),
  reason: z.string().max(200).optional().default(''),
});

module.exports = { penaltySchema };
