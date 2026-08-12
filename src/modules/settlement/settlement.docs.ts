export const settlementDocs = {
  listByPayment: {
    tags: ["Settlements"],
    summary: "List settlements for a payment",
    description:
      "Returns all settlements linked to splits on this payment. Requires active participation.",
    responses: {
      200: { description: "Settlements listed" },
      404: { description: "Payment not found" },
    },
  },
  requestCash: {
    tags: ["Settlements"],
    summary: "Request cash settlement",
    description:
      "Debtor claims they paid all of their pending balances on this payment in cash. Creates one pending settlement per unpaid split for the owner to review.",
    responses: {
      201: { description: "Cash settlements created" },
      400: { description: "Nothing to settle or already pending" },
      404: { description: "Payment not found" },
    },
  },
  confirmCash: {
    tags: ["Settlements"],
    summary: "Confirm cash settlement",
    description:
      "Creditor confirms a debtor's pending cash claim. Marks related splits as settled.",
    responses: {
      200: { description: "Cash settlements confirmed" },
      403: { description: "Only the creditor can confirm" },
      404: { description: "No pending settlements" },
    },
  },
  rejectCash: {
    tags: ["Settlements"],
    summary: "Reject cash settlement",
    description:
      "Creditor rejects a debtor's pending cash claim. Splits stay pending so the debtor still owes.",
    responses: {
      200: { description: "Cash settlements rejected" },
      403: { description: "Only the creditor can reject" },
      404: { description: "No pending settlements" },
    },
  },
};
