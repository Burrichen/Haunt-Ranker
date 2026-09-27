import { AttractionBrowser } from "../components/attractionBrowser";
import { PageHeader } from "../components/ui";
import { useHauntScope } from "../hooks/useHauntScope";
import { useHauntRegistry } from "../hooks/useHauntRegistry";

export function ScareZones() {
  const { scope, hauntId, isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();

  return (
    <>
      <PageHeader
        title={registry.label("scare_zone", hauntId, "many")}
        subtitle={
          isAllHaunts
            ? "Outdoor scares across both haunts and every event."
            : `Outdoor scares across every ${registry.scopeLabel(scope)} event.`
        }
      />
      <AttractionBrowser attractionType="scare_zone" />
    </>
  );
}
