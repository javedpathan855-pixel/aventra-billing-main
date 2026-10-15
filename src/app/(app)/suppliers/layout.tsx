import type { ReactNode } from "react";

export type SuppliersLayoutProps = {
  children: ReactNode;
};

/**
 * Suppliers route layout.
 * Renders child supplier pages with real database persistence.
 */
const SuppliersLayout = ({ children }: SuppliersLayoutProps) => {
  return <>{children}</>;
};

export default SuppliersLayout;
