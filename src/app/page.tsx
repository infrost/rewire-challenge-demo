import { EcosystemCommandCentre } from "@/components/ecosystem-command-centre";
import { getLandscapeMetrics } from "@/lib/landscape";

export default async function Page() {
  const metrics = await getLandscapeMetrics();

  return <EcosystemCommandCentre initialMetrics={metrics} />;
}
