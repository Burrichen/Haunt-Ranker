import { AttractionBrowser } from "../components/attractionBrowser";
import { PageHeader } from "../components/ui";
import { useHauntScope } from "../hooks/useHauntScope";
import { useHauntRegistry } from "../hooks/useHauntRegistry";

export function Houses() {
  const { scope, hauntId, isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();

  return (
    <>
      <PageHeader
        title={registry.label("house", hauntId, "many")}
        subtitle={
          isAllHaunts
            ? "Every walk-through attraction from both haunts, cataloged and ready to rank."
            : `Every walk-through attraction at ${registry.scopeLabel(scope)}, cataloged and ready to rank.`
        }
      />
      <AttractionBrowser attractionType="house" />
    </>
  );
}
