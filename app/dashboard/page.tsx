import { DashboardTabs } from "@/components/DashboardTabs";
import { fetchUserPaymentAccounts } from "@/lib/paymentAccounts";
import { fetchTripsSummary } from "@/lib/tripQueries";

export const runtime = "edge";
export const revalidate = 0;

export default async function DashboardPage() {
  const [trips, userAccounts] = await Promise.all([
    fetchTripsSummary(),
    fetchUserPaymentAccounts(),
  ]);

  return (
    <section>
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-extrabold md:text-3xl"
          style={{ color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Kelola perjalanan, rekening, dan pembagian biaya kamu
        </p>
      </div>

      <DashboardTabs trips={trips as any} userAccounts={userAccounts} />
    </section>
  );
}
