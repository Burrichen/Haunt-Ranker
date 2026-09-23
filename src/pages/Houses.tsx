import { AttractionBrowser } from "../components/attractionBrowser";
import { PageHeader } from "../components/ui";
import { useHauntScope } from "../hooks/useHauntScope";
import { attractionTypeLabel, hauntScopeLabel } from "../models/haunt";

export function Houses() {
  const { scope, hauntId, isAllHaunts } = useHauntScope();

  return (
    <>
      <PageHeader
        title={attractionTypeLabel("house", hauntId, "many")}
        subtitle={
          isAllHaunts
            ? "Every walk-through attraction from both haunts, cataloged and ready to rank."
            : `Every walk-through attraction at ${hauntScopeLabel(scope)}, cataloged and ready to rank.`
        }
      />
      <AttractionBrowser attractionType="house" />
    </>
  );
}
