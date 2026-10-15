import { z } from "zod";
import { isValidTimezone, parseDateParts } from "../../domain/rules/recurrence-rules";

const isRealCalendarDate = (value: string): boolean => parseDateParts(value) !== null;

export const recurringLineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  item: z.string().trim().min(1, "Item or service name is required."),
  description: z.string().optional().default(""),
  hsnSac: z.string().trim().optional(),
  quantity: z.coerce.number().finite("Quantity must be a valid number.").positive("Quantity must be greater than zero."),
  unitPrice: z.coerce.number().finite("Unit price must be a valid number.").min(0, "Unit price cannot be negative."),
  discount: z.coerce.number().finite("Discount must be a valid number.").min(0).max(100, "Discount must be between 0 and 100%.").default(0),
  taxRate: z.coerce.number().finite("Tax rate must be a valid number.").min(0).max(100, "Tax rate must be between 0 and 100%.").default(18),
});

const scheduleBaseFields = {
  name: z.string().trim().min(2, "Schedule name must be at least 2 characters.").max(150),
  customerId: z.string().trim().optional(),
  customerName: z.string().trim().min(1, "Select or enter a customer."),
  customerEmail: z.string().trim().email("Enter a valid email address.").or(z.literal("")).optional(),
  customerAddress: z.string().trim().optional(),
  customerGstin: z.string().trim().optional(),
  customerPlaceOfSupply: z.string().trim().optional(),
  frequency: z.enum(["Weekly", "Monthly", "Quarterly", "Yearly"]),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format.")
    .refine(isRealCalendarDate, "Start date is not a valid calendar date."),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format.")
    .refine(isRealCalendarDate, "End date is not a valid calendar date.")
    .optional(),
  nextRunDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Next run date must be in YYYY-MM-DD format.")
    .refine(isRealCalendarDate, "Next run date is not a valid calendar date.")
    .optional(),
  timezone: z
    .string()
    .trim()
    .max(64)
    .default("Asia/Kolkata")
    .refine(isValidTimezone, "Timezone must be a valid IANA timezone name."),
  paymentTerms: z.string().trim().max(50).default("Net 15 days"),
  additionalCharges: z.coerce.number().finite("Charges must be a valid number.").min(0).default(0),
  additionalChargesLabel: z.string().trim().max(100).optional(),
  additionalDiscount: z.coerce.number().finite("Discount must be a valid number.").min(0).default(0),
  additionalDiscountType: z.enum(["percentage", "fixed"]).default("fixed"),
  additionalDiscountLabel: z.string().trim().max(100).optional(),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters.").optional(),
  terms: z.string().max(2000, "Terms cannot exceed 2000 characters.").optional(),
  items: z.array(recurringLineItemSchema).min(1, "Add at least one line item."),
};

export const createRecurringScheduleSchema = z
  .object(scheduleBaseFields)
  .refine(
    (data) => {
      if (data.additionalDiscountType === "percentage") {
        return data.additionalDiscount <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%.",
      path: ["additionalDiscount"],
    },
  )
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    },
  );

export const updateRecurringScheduleSchema = z
  .object({
    ...scheduleBaseFields,
    id: z.string().min(1, "Schedule ID is required."),
  })
  .refine(
    (data) => {
      if (data.additionalDiscountType === "percentage") {
        return data.additionalDiscount <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%.",
      path: ["additionalDiscount"],
    },
  )
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    },
  );
