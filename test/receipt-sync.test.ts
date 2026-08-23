import { describe, expect, it } from "bun:test";
import {
  decodeReceiptCursor,
  encodeReceiptCursor,
} from "../src/modules/payment/receipt-sync.repository";
import { receiptBundleSchema } from "../src/modules/payment/receipt-sync.validator";

const ids = {
  operation: "00000000-0000-4000-8000-000000000001",
  payment: "00000000-0000-4000-8000-000000000002",
  ownerParticipant: "00000000-0000-4000-8000-000000000003",
  friendParticipant: "00000000-0000-4000-8000-000000000004",
  item: "00000000-0000-4000-8000-000000000005",
  split: "00000000-0000-4000-8000-000000000006",
  assignment: "00000000-0000-4000-8000-000000000007",
};

function bundle(
  method: "equal" | "percentage" | "custom" | "itemized",
  withItem = false,
) {
  return {
    operationId: ids.operation,
    payment: {
      id: ids.payment,
      title: "Offline lunch",
      currency: "USD",
      totalAmountCents: 100,
      taxAmountCents: 0,
      tipAmountCents: 0,
      discountAmountCents: 0,
      splitMethod: method,
    },
    participants: [
      {
        id: ids.ownerParticipant,
        userId: "owner",
        isOwner: true,
      },
      {
        id: ids.friendParticipant,
        userId: "friend",
        isOwner: false,
      },
    ],
    items: withItem
      ? [
          {
            id: ids.item,
            name: "Noodles",
            quantity: 1,
            unitPriceCents: 100,
            totalPriceCents: 100,
          },
        ]
      : [],
    splits: [
      {
        id: ids.split,
        paymentId: ids.payment,
        debtorUserId: "friend",
        creditorUserId: "owner",
        amountCents: method === "equal" ? 50 : 100,
        currency: "USD",
      },
    ],
    assignments:
      method === "itemized"
        ? [
            {
              id: ids.assignment,
              paymentId: ids.payment,
              paymentItemId: ids.item,
              userId: "friend",
              assignedQuantity: 1,
              shareAmountCents: 100,
            },
          ]
        : [],
  };
}

describe("receipt bundle validation", () => {
  it.each(["equal", "percentage", "custom"] as const)(
    "accepts a complete %s graph",
    (method) => {
      expect(receiptBundleSchema.safeParse(bundle(method)).success).toBe(true);
    },
  );

  it("accepts an itemized graph with client-generated IDs", () => {
    expect(receiptBundleSchema.safeParse(bundle("itemized", true)).success).toBe(
      true,
    );
  });

  it("rejects duplicate graph IDs", () => {
    const input = bundle("equal");
    input.splits[0]!.id = ids.friendParticipant;
    expect(receiptBundleSchema.safeParse(input).success).toBe(false);
  });
});

describe("receipt pull cursor", () => {
  it("round-trips an opaque sync position", () => {
    const cursor = encodeReceiptCursor(42);
    expect(cursor).not.toContain("42");
    expect(decodeReceiptCursor(cursor)).toBe(42);
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeReceiptCursor("not-a-cursor")).toThrow(
      "Cursor is invalid",
    );
  });
});
