import HealthCheckPanel from "@/components/app/health/health-check-panel"

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <HealthCheckPanel />
    </div>
  );
}
