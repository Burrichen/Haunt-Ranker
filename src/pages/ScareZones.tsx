import { AttractionBrowser } from "../components/attractionBrowser";
import { PageHeader } from "../components/ui";

export function ScareZones() {
  return (
    <>
      <PageHeader title="Scare Zones" subtitle="Outdoor scare experiences across every event." />
      <AttractionBrowser attractionType="scare_zone" />
    </>
  );
}
