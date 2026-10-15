import "server-only";

import { getPrisma } from "@/shared/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Supplier, SupplierListFilter, SupplierStatus } from "../../domain/entities/supplier";
import type { ISupplierRepository, SupplierListResult } from "../../domain/repositories/supplier-repository";
import {
  SupplierDuplicateError,
  SupplierNotFoundError,
} from "../../domain/errors/supplier-errors";
import { toDomainSupplier } from "../mappers/prisma-supplier-mapper";

const isUniqueViolation = (err: unknown): boolean =>
  (err as { code?: string }).code === "P2002";

export class PrismaSupplierRepository implements ISupplierRepository {
  async findById(organizationId: string, id: string): Promise<Supplier | null> {
    const prisma = getPrisma();
    const row = await prisma.supplier.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!row) return null;
    return toDomainSupplier(row);
  }

  async findByGstin(organizationId: string, gstin: string): Promise<Supplier | null> {
    const prisma = getPrisma();
    const row = await prisma.supplier.findFirst({
      where: {
        organizationId,
        gstin,
      },
    });

    if (!row) return null;
    return toDomainSupplier(row);
  }

  async list(organizationId: string, filter?: SupplierListFilter): Promise<SupplierListResult> {
    const prisma = getPrisma();
    const where: Prisma.SupplierWhereInput = {
      organizationId,
    };

    if (filter?.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter?.query && filter.query.trim().length > 0) {
      const q = filter.query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
        { gstin: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filter?.offset ?? 0,
        take: filter?.limit ?? 50,
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      suppliers: rows.map(toDomainSupplier),
      totalCount,
    };
  }

  async create(supplier: Supplier): Promise<Supplier> {
    const prisma = getPrisma();
    try {
      const row = await prisma.supplier.create({
        data: {
          id: supplier.id,
          organizationId: supplier.organizationId,
          name: supplier.name,
          status: supplier.status,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          alternatePhone: supplier.alternatePhone,
          billingAddressLine1: supplier.billingAddress.addressLine1,
          billingAddressLine2: supplier.billingAddress.addressLine2,
          billingCity: supplier.billingAddress.city,
          billingState: supplier.billingAddress.state,
          billingPinCode: supplier.billingAddress.pinCode,
          billingCountry: supplier.billingAddress.country,
          sameAsBillingAddress: supplier.sameAsBillingAddress,
          shippingAddressLine1: supplier.shippingAddress.addressLine1,
          shippingAddressLine2: supplier.shippingAddress.addressLine2,
          shippingCity: supplier.shippingAddress.city,
          shippingState: supplier.shippingAddress.state,
          shippingPinCode: supplier.shippingAddress.pinCode,
          shippingCountry: supplier.shippingAddress.country,
          gstTreatment: supplier.gstTreatment,
          gstin: supplier.gstin,
          pan: supplier.pan,
          currency: supplier.currency,
          paymentTerms: supplier.paymentTerms,
          internalNotes: supplier.internalNotes,
        },
      });

      return toDomainSupplier(row);
    } catch (err: unknown) {
      if (isUniqueViolation(err) && supplier.gstin) {
        throw new SupplierDuplicateError("GSTIN", supplier.gstin);
      }
      throw err;
    }
  }

  async update(organizationId: string, id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const prisma = getPrisma();
    const data: Prisma.SupplierUpdateInput = {};

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.contactPerson !== undefined) data.contactPerson = updates.contactPerson;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.phone !== undefined) data.phone = updates.phone;
    if (updates.alternatePhone !== undefined) data.alternatePhone = updates.alternatePhone;

    if (updates.billingAddress) {
      data.billingAddressLine1 = updates.billingAddress.addressLine1;
      data.billingAddressLine2 = updates.billingAddress.addressLine2;
      data.billingCity = updates.billingAddress.city;
      data.billingState = updates.billingAddress.state;
      data.billingPinCode = updates.billingAddress.pinCode;
      data.billingCountry = updates.billingAddress.country;
    }

    if (updates.sameAsBillingAddress !== undefined) {
      data.sameAsBillingAddress = updates.sameAsBillingAddress;
    }

    if (updates.shippingAddress) {
      data.shippingAddressLine1 = updates.shippingAddress.addressLine1;
      data.shippingAddressLine2 = updates.shippingAddress.addressLine2;
      data.shippingCity = updates.shippingAddress.city;
      data.shippingState = updates.shippingAddress.state;
      data.shippingPinCode = updates.shippingAddress.pinCode;
      data.shippingCountry = updates.shippingAddress.country;
    }

    if (updates.gstTreatment !== undefined) data.gstTreatment = updates.gstTreatment;
    if (updates.gstin !== undefined) data.gstin = updates.gstin;
    if (updates.pan !== undefined) data.pan = updates.pan;
    if (updates.currency !== undefined) data.currency = updates.currency;
    if (updates.paymentTerms !== undefined) data.paymentTerms = updates.paymentTerms;
    if (updates.internalNotes !== undefined) data.internalNotes = updates.internalNotes;

    try {
      const result = await prisma.supplier.updateMany({
        where: { id, organizationId },
        data,
      });

      if (result.count === 0) {
        throw new SupplierNotFoundError(id);
      }

      const updated = await this.findById(organizationId, id);
      if (!updated) {
        throw new SupplierNotFoundError(id);
      }
      return updated;
    } catch (err: unknown) {
      if (err instanceof SupplierNotFoundError) throw err;
      if (isUniqueViolation(err) && updates.gstin) {
        throw new SupplierDuplicateError("GSTIN", updates.gstin);
      }
      throw err;
    }
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: SupplierStatus,
  ): Promise<Supplier> {
    const prisma = getPrisma();
    const result = await prisma.supplier.updateMany({
      where: { id, organizationId },
      data: { status },
    });

    if (result.count === 0) {
      throw new SupplierNotFoundError(id);
    }

    const updated = await this.findById(organizationId, id);
    if (!updated) {
      throw new SupplierNotFoundError(id);
    }
    return updated;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const prisma = getPrisma();
    const result = await prisma.supplier.deleteMany({
      where: { id, organizationId },
    });

    if (result.count === 0) {
      throw new SupplierNotFoundError(id);
    }
  }
}

export const supplierRepository = new PrismaSupplierRepository();
