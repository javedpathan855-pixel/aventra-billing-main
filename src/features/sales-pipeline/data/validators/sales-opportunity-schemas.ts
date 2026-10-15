import { z } from "zod";

export const opportunityStageSchema = z.enum([
  "NEW_LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

// Terminal stages WON/LOST are reachable only through validated stage
// transitions (with a mandatory loss reason for LOST), never forged at
// creation: a new opportunity always enters the pipeline as an open stage.
export const initialOpportunityStageSchema = z.enum([
  "NEW_LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
]);

export const createOpportunitySchema = z.object({
  title: z.string().trim().min(1, "Opportunity title is required.").max(255),
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1, "Customer or lead name is required.").max(255),
  customerEmail: z.string().trim().email("Invalid email address.").optional().nullable().or(z.literal("")),
  customerPhone: z.string().trim().max(50).optional().nullable(),
  contactPerson: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(100).optional().default("Website"),
  stage: initialOpportunityStageSchema.optional().default("NEW_LEAD"),
  estimatedValue: z.coerce.number().min(0, "Estimated value cannot be negative."),
  currency: z.string().trim().default("INR (₹)"),
  probability: z.coerce.number().min(0).max(100).optional().default(10),
  expectedCloseDate: z.string().optional().nullable(),
  assignedTo: z.string().trim().max(255).optional().nullable(),
  nextFollowUpDate: z.string().optional().nullable(),
  nextAction: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateOpportunitySchema = z.object({
  title: z.string().trim().min(1, "Opportunity title is required.").max(255).optional(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1, "Customer name is required.").max(255).optional(),
  customerEmail: z.string().trim().email("Invalid email address.").optional().nullable().or(z.literal("")),
  customerPhone: z.string().trim().max(50).optional().nullable(),
  contactPerson: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(100).optional(),
  stage: opportunityStageSchema.optional(),
  estimatedValue: z.coerce.number().min(0, "Estimated value cannot be negative.").optional(),
  currency: z.string().trim().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().nullable(),
  assignedTo: z.string().trim().max(255).optional().nullable(),
  nextFollowUpDate: z.string().optional().nullable(),
  nextAction: z.string().trim().max(255).optional().nullable(),
  lossReason: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateOpportunityStageSchema = z.object({
  stage: opportunityStageSchema,
  lossReason: z.string().trim().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.stage === "LOST") {
      return !!data.lossReason && data.lossReason.trim().length > 0;
    }
    return true;
  },
  {
    message: "A loss reason is required when marking an opportunity as LOST.",
    path: ["lossReason"],
  },
);
