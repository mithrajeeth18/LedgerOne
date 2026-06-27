import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Groups
    tableSchema({
      name: 'groups',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Customers
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'group_id', type: 'string' },
        { name: 'guarantor_name', type: 'string', isOptional: true },
        { name: 'guarantor_phone', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Loans
    tableSchema({
      name: 'loans',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'loan_number', type: 'number' },
        { name: 'customer_id', type: 'string' },
        { name: 'group_id', type: 'string' },
        { name: 'principal_amount', type: 'number' },
        { name: 'interest_rate', type: 'number' },
        { name: 'total_repayable', type: 'number' },
        { name: 'installment_amount', type: 'number' },
        { name: 'repayment_type', type: 'string' },
        { name: 'loan_term_days', type: 'number' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'total_paid', type: 'number' },
        { name: 'remaining_balance', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Payments
    tableSchema({
      name: 'payments',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'local_id', type: 'string' },
        { name: 'loan_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'payment_date', type: 'string' },
        { name: 'payment_method', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Penalties
    tableSchema({
      name: 'penalties',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'loan_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'reason', type: 'string' },
        { name: 'penalty_date', type: 'string' },
        { name: 'is_waived', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
