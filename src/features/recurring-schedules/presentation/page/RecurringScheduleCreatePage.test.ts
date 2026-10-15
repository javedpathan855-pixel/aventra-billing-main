import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecurringScheduleCreatePage } from "./RecurringScheduleCreatePage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../../data/mutations/recurring-schedule-mutations", () => ({
  createRecurringScheduleAction: vi.fn(),
  updateRecurringScheduleAction: vi.fn(),
}));

const customers = [
  {
    id: "cust-1",
    name: "Acme Corp",
    email: "billing@acme.com",
    address: "Mumbai, Maharashtra",
    gstin: "27AABCB1234F1Z1",
    placeOfSupply: "27-Maharashtra",
    paymentTerms: "Net 30 days",
  },
];

const products = [
  {
    id: "prod-1",
    name: "Monthly Retainer",
    type: "SERVICE" as const,
    sku: "SRV-RET",
    description: "Engineering retainer",
    sellingPrice: 50000,
    hsnSac: "998314",
    taxRate: 18,
    unit: "JOB",
  },
  {
    id: "prod-2",
    name: "Sensor Gateway",
    type: "PRODUCT" as const,
    sku: "HW-GW",
    description: "Hardware unit",
    sellingPrice: 12000,
    hsnSac: "8523",
    taxRate: 18,
    unit: "PCS",
  },
];

describe("RecurringScheduleCreatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders schedule, customer, recurrence, and preview sections", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringScheduleCreatePage, {
        initialCustomers: customers,
        initialProducts: products,
        initialInvoiceNumber: "INV-0042",
        initialDefaultNotes: "Settings default note",
        initialDefaultTerms: "Settings default terms",
      }),
    );

    expect(html).toContain("Create Recurring Invoice");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Monthly");
    expect(html).toContain("Invoice Summary");
    expect(html).toContain("Estimated totals for the next scheduled invoice.");
    expect(html).toContain("Total Amount");
    expect(html).toContain("GST Summary");
    expect(html).toContain("Create Schedule");
    expect(html).toContain("schedule-start-date-trigger");
    expect(html).not.toContain('type="date"');
    // Invoice Details section mirrors Create Invoice: header, add-customer
    // affordance, profile placeholder, number preview, terms presets.
    expect(html).toContain("Invoice Details");
    expect(html).toContain("Select a customer for the generated invoices.");
    expect(html).toContain("+ Add Customer");
    expect(html).toContain("Customer Details");
    expect(html).toContain("Select a customer to view their information.");
    expect(html).toContain("First Invoice Number");
    expect(html).toContain("Net 30 days");
    // Billing Settings wiring: number preview + default notes/terms.
    expect(html).toContain("INV-0042");
    expect(html).toContain("Settings default note");
    expect(html).toContain("Settings default terms");
  });

  it("shows the empty-customers state without a selector", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringScheduleCreatePage, {
        initialCustomers: [],
        initialProducts: products,
      }),
    );

    expect(html).toContain("No customer records found in this organization.");
    expect(html).toContain("Create Customer");
  });

  it("renders edit mode with existing values", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringScheduleCreatePage, {
        initialCustomers: customers,
        initialProducts: products,
        existingSchedule: {
          id: "rsch-1",
          organizationId: "org-1",
          name: "Acme retainer",
          customerId: "cust-1",
          customerName: "Acme Corp",
          customerEmail: "",
          customerAddress: "",
          customerGstin: "",
          frequency: "Quarterly",
          startDate: "2026-01-15",
          nextRunDate: "2026-10-15",
          timezone: "Asia/Kolkata",
          status: "Paused",
          paymentTerms: "Net 15 days",
          additionalCharges: 0,
          additionalDiscount: 0,
          additionalDiscountType: "fixed",
          notes: "",
          terms: "",
          items: [
            {
              id: "line-1",
              item: "Quarterly review",
              description: "",
              quantity: 1,
              unitPrice: 20000,
              discount: 0,
              taxRate: 18,
            },
          ],
          successCount: 2,
          failureCount: 0,
          consecutiveFailures: 0,
        },
      }),
    );

    expect(html).toContain("Edit Recurring Schedule");
    expect(html).toContain("Acme retainer");
    expect(html).toContain("Quarterly");
    expect(html).toContain("Save Changes");
    // Real catalogue options with product/service distinction.
    expect(html).toContain("[Service] Monthly Retainer (SRV-RET)");
    expect(html).toContain("[Product] Sensor Gateway (HW-GW)");
    // Summary mirrors Create Invoice: rows, GST sub-card with rate slabs, total.
    expect(html).toContain("Taxable Amount");
    expect(html).toContain("Central GST (CGST)");
    expect(html).toContain("Rate Slabs");
    expect(html).toContain("GST @ 18%");
    expect(html).toContain("Total Amount");
  });
});
