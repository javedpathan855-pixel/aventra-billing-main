import "server-only";

import { getPrisma } from "@/shared/lib/prisma";
import type {
  OutstandingBillRow,
  PaymentMethodSummary,
  PurchaseReportFilters,
  PurchaseReportsBundle,
  StatusCountSummary,
  SupplierPaymentSummary,
  SupplierPurchaseRow,
} from "../../domain/entities/purchase-report";
import type { IPurchaseReportRepository } from "../../domain/repositories/purchase-report-repository";
import { calculateBillOutstanding } from "../../domain/entities/purchase-report";

const round2 = (val: number): number =>
  Math.round((val + Number.EPSILON) * 100) / 100;

const MAX_OUTSTANDING_ROWS = 200;

const displayReturnStatus = (status: string): string => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "APPROVED":
      return "Approved";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
};

const displayOrderStatus = (status: string): string => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "CONFIRMED":
      return "Confirmed";
    case "PARTIALLY_RECEIVED":
      return "Partially Received";
    case "RECEIVED":
      return "Received";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
};

export class PrismaPurchaseReportRepository
  implements IPurchaseReportRepository
{
  async getReports(
    organizationId: string,
    filters?: PurchaseReportFilters,
  ): Promise<PurchaseReportsBundle> {
    const prisma = getPrisma();
    const { from, to, supplierId } = filters ?? {};

    const dateRange =
      from || to
        ? {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          }
        : undefined;

    const billWhere = {
      organizationId,
      status: "CONFIRMED" as const,
      ...(dateRange ? { billDate: dateRange } : {}),
      ...(supplierId ? { supplierId } : {}),
    };

    const returnWhere = {
      organizationId,
      status: "COMPLETED" as const,
      ...(dateRange ? { returnDate: dateRange } : {}),
      ...(supplierId ? { supplierId } : {}),
    };

    const paymentWhere = {
      organizationId,
      status: "ACTIVE" as const,
      ...(dateRange ? { paymentDate: dateRange } : {}),
      ...(supplierId ? { supplierId } : {}),
    };

    const orderWhere = {
      organizationId,
      ...(dateRange ? { orderDate: dateRange } : {}),
      ...(supplierId ? { supplierId } : {}),
    };

    const [
      billAgg,
      billsBySupplier,
      retAgg,
      retByStatus,
      retBySupplier,
      allocByBill,
      billsLite,
      payByMethod,
      payBySupplier,
      payCount,
      orderByStatus,
    ] = await Promise.all([
      prisma.purchaseBill.aggregate({
        where: billWhere,
        _count: true,
        _sum: {
          total: true,
          totalTax: true,
          taxableAmount: true,
          cgst: true,
          sgst: true,
          igst: true,
        },
      }),
      prisma.purchaseBill.groupBy({
        by: ["supplierId", "supplierName"],
        where: billWhere,
        _count: true,
        _sum: { total: true, totalTax: true },
      }),
      prisma.purchaseReturn.aggregate({
        where: returnWhere,
        _count: true,
        _sum: { totalAmount: true, taxAmount: true },
      }),
      prisma.purchaseReturn.groupBy({
        by: ["status"],
        where: {
          organizationId,
          ...(dateRange ? { returnDate: dateRange } : {}),
          ...(supplierId ? { supplierId } : {}),
        },
        _count: true,
        _sum: { totalAmount: true, taxAmount: true },
      }),
      prisma.purchaseReturn.groupBy({
        by: ["supplierId", "supplierName"],
        where: returnWhere,
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.supplierPaymentAllocation.groupBy({
        by: ["purchaseBillId"],
        where: {
          organizationId,
          payment: { status: "ACTIVE" },
          purchaseBill: {
            organizationId,
            status: "CONFIRMED",
            ...(dateRange ? { billDate: dateRange } : {}),
            ...(supplierId ? { supplierId } : {}),
          },
        },
        _sum: { amount: true },
      }),
      prisma.purchaseBill.findMany({
        where: billWhere,
        select: {
          id: true,
          billNumber: true,
          supplierId: true,
          supplierName: true,
          billDate: true,
          dueDate: true,
          total: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.supplierPayment.groupBy({
        by: ["method"],
        where: paymentWhere,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.supplierPayment.groupBy({
        by: ["supplierId", "supplierName"],
        where: paymentWhere,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.supplierPayment.aggregate({
        where: paymentWhere,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.purchaseOrder.groupBy({
        by: ["status"],
        where: orderWhere,
        _count: true,
        _sum: { total: true },
      }),
    ]);

    const allocatedByBill = new Map<string, number>();
    for (const row of allocByBill) {
      allocatedByBill.set(
        row.purchaseBillId,
        Number(row._sum.amount ?? 0),
      );
    }

    // Outstanding: exact per-bill math over the filtered set; only the
    // display rows are capped.
    const outstandingRows: OutstandingBillRow[] = [];
    let totalOutstanding = 0;
    let outstandingBillCount = 0;
    for (const bill of billsLite) {
      const paid = allocatedByBill.get(bill.id) ?? 0;
      const outstanding = calculateBillOutstanding(Number(bill.total), paid);
      if (outstanding <= 0) {
        continue;
      }
      outstandingBillCount++;
      totalOutstanding = round2(totalOutstanding + outstanding);
      if (outstandingRows.length < MAX_OUTSTANDING_ROWS) {
        outstandingRows.push({
          billId: bill.id,
          billNumber: bill.billNumber,
          supplierId: bill.supplierId,
          supplierName: bill.supplierName,
          billDate: bill.billDate.toISOString().split("T")[0],
          dueDate: bill.dueDate.toISOString().split("T")[0],
          total: Number(bill.total),
          paidAmount: round2(paid),
          outstanding,
        });
      }
    }

    // Per-supplier rollup from the same aggregate sources (no N+1, no
    // truncation): bill totals and return totals by supplier, outstanding
    // derived from the exact per-bill figures above via supplier grouping.
    const outstandingBySupplier = new Map<string | null, number>();
    for (const bill of billsLite) {
      const paid = allocatedByBill.get(bill.id) ?? 0;
      const outstanding = calculateBillOutstanding(Number(bill.total), paid);
      if (outstanding <= 0) {
        continue;
      }
      outstandingBySupplier.set(
        bill.supplierId,
        round2((outstandingBySupplier.get(bill.supplierId) ?? 0) + outstanding),
      );
    }

    const returnsBySupplier = new Map<
      string | null,
      { name: string; total: number }
    >();
    for (const row of retBySupplier) {
      returnsBySupplier.set(row.supplierId, {
        name: row.supplierName,
        total: Number(row._sum.totalAmount ?? 0),
      });
    }

    const bySupplier: SupplierPurchaseRow[] = billsBySupplier.map((row) => {
      const gross = Number(row._sum.total ?? 0);
      const tax = Number(row._sum.totalTax ?? 0);
      const ret = returnsBySupplier.get(row.supplierId)?.total ?? 0;
      return {
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        billCount: row._count,
        grossPurchases: round2(gross),
        inputTax: round2(tax),
        returnsTotal: round2(ret),
        netPurchases: round2(gross - ret),
        outstanding: outstandingBySupplier.get(row.supplierId) ?? 0,
      };
    });
    bySupplier.sort((a, b) => b.netPurchases - a.netPurchases);

    const grossPurchases = Number(billAgg._sum.total ?? 0);
    const inputTax = Number(billAgg._sum.totalTax ?? 0);
    const returnsTotal = Number(retAgg._sum.totalAmount ?? 0);
    const returnsTax = Number(retAgg._sum.taxAmount ?? 0);

    const byMethod: PaymentMethodSummary[] = payByMethod.map((row) => ({
      method: String(row.method),
      paymentCount: row._count,
      totalPaid: round2(Number(row._sum.amount ?? 0)),
    }));

    const paymentSuppliers: SupplierPaymentSummary[] = payBySupplier.map(
      (row) => ({
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        paymentCount: row._count,
        totalPaid: round2(Number(row._sum.amount ?? 0)),
      }),
    );

    const orderRows: StatusCountSummary[] = orderByStatus.map((row) => ({
      status: displayOrderStatus(String(row.status)),
      count: row._count,
      total: round2(Number(row._sum.total ?? 0)),
    }));

    const returnRows: StatusCountSummary[] = retByStatus.map((row) => ({
      status: displayReturnStatus(String(row.status)),
      count: row._count,
      total: round2(Number(row._sum.totalAmount ?? 0)),
    }));

    const cgst = Number(billAgg._sum.cgst ?? 0);
    const sgst = Number(billAgg._sum.sgst ?? 0);
    const igst = Number(billAgg._sum.igst ?? 0);

    return {
      summary: {
        billCount: billAgg._count,
        grossPurchases: round2(grossPurchases),
        inputTax: round2(inputTax),
        returnCount: retAgg._count,
        returnsTotal: round2(returnsTotal),
        returnsTax: round2(returnsTax),
        netPurchases: round2(grossPurchases - returnsTotal),
        netTax: round2(inputTax - returnsTax),
      },
      bySupplier,
      outstanding: {
        rows: outstandingRows,
        totalOutstanding: round2(totalOutstanding),
        billCount: outstandingBillCount,
        truncated: outstandingBillCount > outstandingRows.length,
      },
      tax: {
        grossPurchases: round2(grossPurchases),
        cgst: round2(cgst),
        sgst: round2(sgst),
        igst: round2(igst),
        inputTax: round2(inputTax),
        returnsTotal: round2(returnsTotal),
        returnsTax: round2(returnsTax),
        netPurchases: round2(grossPurchases - returnsTotal),
        netTax: round2(inputTax - returnsTax),
      },
      payments: {
        paymentCount: payCount._count,
        totalPaid: round2(Number(payCount._sum.amount ?? 0)),
        byMethod,
        bySupplier: paymentSuppliers,
      },
      orders: {
        rows: orderRows,
        totalOrders: orderRows.reduce((sum, row) => sum + row.count, 0),
        totalAmount: round2(
          orderRows.reduce((sum, row) => sum + row.total, 0),
        ),
      },
      returns: {
        rows: returnRows,
        returnCount: returnRows.reduce((sum, row) => sum + row.count, 0),
        returnsTotal: round2(
          returnRows.reduce((sum, row) => sum + row.total, 0),
        ),
        returnsTax: round2(returnsTax),
      },
    };
  }
}

export const purchaseReportRepository = new PrismaPurchaseReportRepository();
