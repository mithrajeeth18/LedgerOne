const { z } = require('zod');

const customerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
}).refine((data) => data.name !== undefined || data.phone !== undefined, {
  message: 'At least one field is required',
});

module.exports = { customerSchema, updateCustomerSchema };
