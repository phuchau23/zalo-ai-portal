import type { Metadata } from "next";
import { PaymentSection } from "../payment-section";

export const metadata: Metadata = { title: "Thanh toán — Trợ lý Zalo AI" };

export default function Page() {
  return <PaymentSection />;
}
