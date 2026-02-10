/**
 * Definisi limit per plan.
 * Kalau plan baru ditambah, cukup tambah di sini.
 *
 * Saat ini belum di-enforce di service manapun.
 * Nanti tinggal panggil:
 *   await this.subscriptionService.checkProductLimit(tenantId);
 * di service yang mau dikunci.
 */
export const PLAN_LIMITS = {
  STARTER: {
    maxProducts: 50,
    maxCustomers: 200,
    componentBlockVariants: 10,
  },
  BUSINESS: {
    maxProducts: Infinity,
    maxCustomers: Infinity,
    componentBlockVariants: 50,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanFeature = keyof (typeof PLAN_LIMITS)['STARTER'];
