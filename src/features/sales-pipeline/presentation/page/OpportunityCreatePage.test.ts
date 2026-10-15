import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OpportunityCreatePage } from "./OpportunityCreatePage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../data/mutations/create-opportunity", () => ({
  createOpportunityAction: vi.fn(),
}));

const mockCustomers = [
  {
    id: "cust-1",
    name: "Acme Industrial Corp",
    email: "finance@acme.com",
    phone: "+91 98765 43210",
  },
];

describe("OpportunityCreatePage Presentation & Style Parity", () => {
  it("renders with exact Sales Order layout style and sections", () => {
    const html = renderToStaticMarkup(
      createElement(OpportunityCreatePage, {
        customers: mockCustomers,
      }),
    );

    // Back link + header
    expect(html).toContain("Back to Sales Pipeline");
    expect(html).toContain("New Sales Opportunity");
    expect(html).toContain("Preview Opportunity");

    // Section 1: Opportunity & Customer Details
    expect(html).toContain("Opportunity &amp; Customer Details");
    expect(html).toContain("Opportunity Title");
    expect(html).toContain("Pipeline Stage");
    expect(html).toContain("Lead Source");

    // Section 2: Commercials + Forecast Summary side-by-side
    expect(html).toContain("Deal Commercials &amp; Schedule");
    expect(html).toContain("Estimated Value");
    expect(html).toContain("Win Probability");
    expect(html).toContain("Expected Close Date");
    expect(html).toContain("Next Follow-Up Date");
    expect(html).toContain("Forecast Summary");
    expect(html).toContain("Weighted Forecast");

    // Section 3: Notes
    expect(html).toContain("Deal Scope &amp; Internal Notes");

    // Bottom Action Bar
    expect(html).toContain("Cancel");
    expect(html).toContain("Create Opportunity");
  });

  it("strictly uses shared DatePicker component and never native date inputs", () => {
    const html = renderToStaticMarkup(
      createElement(OpportunityCreatePage, {
        customers: mockCustomers,
      }),
    );

    // Shared DatePicker renders a button trigger with calendar icon, never type="date"
    expect(html).not.toContain('type="date"');
    expect(html).toContain("opp-expected-close");
    expect(html).toContain("opp-follow-up");
  });
});
