"use client";

import { Truck } from "lucide-react";
import type { ChangeEvent } from "react";
import { Input, Label, Select } from "@/shared/components/form";

export type DeliveryChallanTransportSectionProps = {
  transporterName: string;
  onTransporterNameChange: (val: string) => void;
  vehicleNumber: string;
  onVehicleNumberChange: (val: string) => void;
  trackingNumber: string;
  onTrackingNumberChange: (val: string) => void;
  transportMode: string;
  onTransportModeChange: (val: string) => void;
};

const transportModeOptions = [
  { value: "Road", label: "Road Freight" },
  { value: "Rail", label: "Rail" },
  { value: "Air", label: "Air Cargo" },
  { value: "Hand Delivery", label: "Direct Hand Delivery" },
  { value: "Courier", label: "Courier / Express" },
];

export const DeliveryChallanTransportSection = ({
  transporterName,
  onTransporterNameChange,
  vehicleNumber,
  onVehicleNumberChange,
  trackingNumber,
  onTrackingNumberChange,
  transportMode,
  onTransportModeChange,
}: DeliveryChallanTransportSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-4">
      {/* 1. Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <Truck size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Transportation &amp; Vehicle
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Carrier, vehicle, tracking, and transport mode for this dispatch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="delivery-challan-transporter"
            className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
          >
            Transporter / Carrier
          </Label>
          <div className="mt-1.5">
            <Input
              id="delivery-challan-transporter"
              type="text"
              value={transporterName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onTransporterNameChange(e.target.value)
              }
              placeholder="e.g. BlueDart, VRL Logistics"
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="delivery-challan-vehicle"
            className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
          >
            Vehicle Number
          </Label>
          <div className="mt-1.5">
            <Input
              id="delivery-challan-vehicle"
              type="text"
              value={vehicleNumber}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onVehicleNumberChange(e.target.value)
              }
              placeholder="e.g. MH-31-EQ-1234"
              className="h-10 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="delivery-challan-tracking"
            className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
          >
            Docket / Tracking No.
          </Label>
          <div className="mt-1.5">
            <Input
              id="delivery-challan-tracking"
              type="text"
              value={trackingNumber}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onTrackingNumberChange(e.target.value)
              }
              placeholder="e.g. BDX-9821440"
              className="h-10 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="delivery-challan-mode"
            className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
          >
            Transport Mode
          </Label>
          <div className="mt-1.5">
            <Select
              id="delivery-challan-mode"
              value={transportMode}
              onChange={onTransportModeChange}
              options={transportModeOptions}
              className="h-10 text-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
