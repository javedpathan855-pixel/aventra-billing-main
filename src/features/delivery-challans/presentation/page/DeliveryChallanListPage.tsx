"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { Button } from "@/shared/components/form";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";
import { DeliveryChallanTable } from "../components/DeliveryChallanTable";
import { DeliveryChallanFilterBar } from "../components/DeliveryChallanFilterBar";

export type DeliveryChallanListPageProps = {
  initialChallans: DeliveryChallan[];
};

export const DeliveryChallanListPage = ({
  initialChallans,
}: DeliveryChallanListPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredChallans = initialChallans.filter((challan) => {
    if (statusFilter !== "all" && challan.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchNumber = challan.challanNumber.toLowerCase().includes(q);
      const matchCustomer = challan.customerName.toLowerCase().includes(q);
      const matchVehicle = (challan.vehicleNumber || "").toLowerCase().includes(q);
      const matchTracking = (challan.trackingNumber || "").toLowerCase().includes(q);
      const matchSo = (challan.salesOrderNumber || "").toLowerCase().includes(q);
      return matchNumber || matchCustomer || matchVehicle || matchTracking || matchSo;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
              <Truck size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Delivery Challans
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Manage physical deliveries, partial shipments, transport details, and order fulfilment tracking.
          </p>
        </div>

        <Link href="/delivery-challans/new">
          <Button variant="primary" className="h-10 px-4 text-sm font-semibold shadow-xs">
            <Plus size={16} />
            <span>Create Delivery Challan</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <DeliveryChallanFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Table */}
      <DeliveryChallanTable challans={filteredChallans} />
    </div>
  );
};
