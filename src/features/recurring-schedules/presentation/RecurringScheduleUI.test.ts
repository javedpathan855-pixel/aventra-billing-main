import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RecurringScheduleListPage } from "./page/RecurringScheduleListPage";
import { RecurringStatusBadge } from "./components/RecurringStatusBadge";
import { OccurrenceStatusBadge } from "./components/OccurrenceStatusBadge";
import { RecurringScheduleTable } from "./components/RecurringScheduleTable";
import { RecurringItemsSection } from "./components/RecurringItemsSection";
import { RecurringSummaryCards } from "./components/RecurringSummaryCards";
import { summarizeSchedules } from "../domain/rules/recurring-filter";
import type { RecurringSchedule } from "../domain/recurring-schedule";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const schedule = (overrides: Partial<RecurringSchedule> = {}): RecurringSchedule => ({
  id: "rsch-1",
  organizationId: "org-1",
  name: "Acme monthly retainer",
  customerName: "Acme",
  customerEmail: "",
  customerAddress: "",
  customerGstin: "",
  frequency: "Monthly",
  startDate: "2026-01-15",
  nextRunDate: "2026-10-15",
  timezone: "Asia/Kolkata",
  status: "Active",
  paymentTerms: "Net 15 days",
  additionalCharges: 0,
  additionalDiscount: 0,
  additionalDiscountType: "fixed",
  notes: "",
  terms: "",
  items: [],
  successCount: 3,
  failureCount: 0,
  consecutiveFailures: 0,
  ...overrides,
});

describe("recurring schedules presentation", () => {
  it("renders status badges for schedule and occurrence states", () => {
    for (const status of ["Active", "Paused", "Completed", "Cancelled"] as const) {
      expect(
        renderToStaticMarkup(createElement(RecurringStatusBadge, { status })),
      ).toContain(status);
    }
    for (const status of ["Pending", "Processing", "Succeeded", "Failed"] as const) {
      expect(
        renderToStaticMarkup(createElement(OccurrenceStatusBadge, { status })),
      ).toContain(status);
    }
  });

  it("renders the table with view and conditional edit actions", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringScheduleTable, {
        schedules: [
          schedule(),
          schedule({ id: "rsch-2", name: "Beta weekly", status: "Completed" }),
        ],
      }),
    );
    expect(html).toContain("Acme monthly retainer");
    expect(html).toContain("Beta weekly");
    expect(html).toContain("/recurring-invoices/rsch-1");
    expect(html).toContain("recurring-invoices/new?edit=rsch-1");
    expect(html).not.toContain("recurring-invoices/new?edit=rsch-2");
  });

  it("renders summary cards with generated invoice counts", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringSummaryCards, {
        summary: summarizeSchedules([schedule(), schedule({ id: "b", status: "Paused" })]),
      }),
    );
    expect(html).toContain("Total Schedules");
    expect(html).toContain("Invoices Generated");
  });

  it("renders list empty and populated states", () => {
    const empty = renderToStaticMarkup(
      createElement(RecurringScheduleListPage, { initialSchedules: [] }),
    );
    expect(empty).toContain("No recurring schedules yet");
    expect(empty).toContain("New Schedule");

    const populated = renderToStaticMarkup(
      createElement(RecurringScheduleListPage, { initialSchedules: [schedule()] }),
    );
    expect(populated).toContain("Acme monthly retainer");
    expect(populated).toContain("Next Run");
  });

  it("renders catalogue options with product/service distinction", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringItemsSection, {
        items: [
          {
            id: "line-1",
            item: "",
            description: "",
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            taxRate: 18,
          },
        ],
        onUpdateLine: vi.fn(),
        onRemoveLine: vi.fn(),
        onAddLine: vi.fn(),
        availableProducts: [
          {
            id: "prod-1",
            name: "Monthly Retainer",
            type: "SERVICE",
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
            type: "PRODUCT",
            sku: "HW-GW",
            description: "Hardware unit",
            sellingPrice: 12000,
            hsnSac: "8523",
            taxRate: 18,
            unit: "PCS",
          },
        ],
        errors: {},
      }),
    );

    expect(html).toContain("[Service] Monthly Retainer (SRV-RET)");
    expect(html).toContain("[Product] Sensor Gateway (HW-GW)");
    expect(html).toContain("Custom product/service...");
  });

  it("shows the honest empty-catalogue state without fake products", () => {
    const html = renderToStaticMarkup(
      createElement(RecurringItemsSection, {
        items: [
          {
            id: "line-1",
            item: "",
            description: "",
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            taxRate: 18,
          },
        ],
        onUpdateLine: vi.fn(),
        onRemoveLine: vi.fn(),
        errors: {},
        availableProducts: [],
      }),
    );

    expect(html).toContain("No products or services in catalogue");
  });
});
