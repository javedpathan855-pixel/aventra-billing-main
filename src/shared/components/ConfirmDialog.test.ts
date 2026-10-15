import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("Shared ConfirmDialog Component", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: false,
        title: "Delete supplier?",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toBe("");
  });

  it("renders title, description, and action labels with dialog semantics", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Deactivate supplier?",
        description: "The supplier will be hidden from new purchases.",
        confirmLabel: "Deactivate",
        cancelLabel: "Keep Active",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Deactivate supplier?");
    expect(html).toContain("The supplier will be hidden from new purchases.");
    expect(html).toContain("Deactivate");
    expect(html).toContain("Keep Active");
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="confirm-dialog-title"');
    expect(html).toContain('aria-describedby="confirm-dialog-description"');
  });

  it("uses the danger treatment by default and primary on request", () => {
    const dangerHtml = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Delete?",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(dangerHtml).toContain("bg-danger/10");

    const primaryHtml = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Activate?",
        variant: "primary",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(primaryHtml).not.toContain("bg-danger/10");
  });

  it("uses only shared button primitives and semantic tokens", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Delete?",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(html).not.toContain("<input");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("#");
  });
});
