import { paymentService } from "../payment/payment.service";
import { splitsService } from "../splits/splits.service";

export const meService = {
  listPayments(userId: string) {
    return paymentService.listPaymentRecords(userId);
  },

  listSplitsOwedByMe(userId: string) {
    return splitsService.listOwedByMe(userId);
  },

  listSplitsOwedToMe(userId: string) {
    return splitsService.listOwedToMe(userId);
  },
};
