const { z } = require('zod');

const groupSchema = z.object({
  name: z.string().trim().min(2).max(50),
});

module.exports = { groupSchema };
