import type { Metadata } from "next";
import { PaymentSection } from "../payment-section";

export const metadata: Metadata = { title: "Thanh toán — Remi" };

export default function Page() {
  return <PaymentSection />;
}
