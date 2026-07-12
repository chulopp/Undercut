import { CompetitorPanel } from "@/components/dashboard/CompetitorPanel";
import { LeadQueue } from "@/components/dashboard/LeadQueue";
import { DifferentiatorPanel } from "@/components/dashboard/DifferentiatorPanel";
import { InstagramIcon } from "@/components/ui/BrandIcons";

const PLATFORM = "INSTAGRAM" as const;

export default function DashboardInstagram() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <InstagramIcon style={{ fontSize: 24 }} />
          <span>Instagram leads</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Monitor competitor posts via username. Reply copies draft and opens
          the original post.
        </p>
      </header>

      <CompetitorPanel platform={PLATFORM} />
      <LeadQueue platform={PLATFORM} />
      <DifferentiatorPanel />
    </div>
  );
}