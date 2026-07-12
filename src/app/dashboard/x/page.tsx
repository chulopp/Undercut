import { CompetitorPanel } from "@/components/dashboard/CompetitorPanel";
import { LeadQueue } from "@/components/dashboard/LeadQueue";
import { DifferentiatorPanel } from "@/components/dashboard/DifferentiatorPanel";
import { XIcon } from "@/components/ui/BrandIcons";

const PLATFORM = "X" as const;

export default function DashboardX() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <XIcon style={{ fontSize: 24 }} />
          <span>X (Twitter) leads</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Monitor complaints by free-text keyword search. Reply directly via X
          intent URL.
        </p>
      </header>

      <CompetitorPanel platform={PLATFORM} />
      <LeadQueue platform={PLATFORM} />
      <DifferentiatorPanel />
    </div>
  );
}