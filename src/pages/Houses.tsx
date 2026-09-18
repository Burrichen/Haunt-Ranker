import { AttractionBrowser } from "../components/attractionBrowser";
import { PageHeader } from "../components/ui";

export function Houses() {
  return (
    <>
      <PageHeader title="Houses" subtitle="Every haunted house, cataloged and ready to rank." />
      <AttractionBrowser attractionType="house" />
    </>
  );
}
