import { AttractionBrowser } from "../components/attractionBrowser";
import { PageHeader } from "../components/ui";
import { useHauntScope } from "../hooks/useHauntScope";
import { attractionTypeLabel, hauntScopeLabel } from "../models/haunt";

export function ScareZones() {
  const { scope, hauntId, isAllHaunts } = useHauntScope();

  return (
    <>
      <PageHeader
        title={attractionTypeLabel("scare_zone", hauntId, "many")}
        subtitle={
          isAllHaunts
            ? "Outdoor scares across both haunts and every event."
            : `Outdoor scares across every ${hauntScopeLabel(scope)} event.`
        }
      />
      <AttractionBrowser attractionType="scare_zone" />
    </>
  );
}
