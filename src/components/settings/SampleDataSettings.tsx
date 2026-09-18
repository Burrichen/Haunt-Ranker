import { CircleAlert, CircleCheck, FlaskConical, RotateCcw, Trash2 } from "lucide-react";
import { useSampleData } from "../../hooks/useSampleData";
import { Badge, Button, Panel } from "../ui";
import "./SettingsPanels.css";

/**
 * The fictional development dataset, and only in a development build — a
 * shipped app has no business writing invented attractions into someone's
 * archive. `useSampleData` gates this on `import.meta.env.DEV`; this
 * component renders nothing at all otherwise.
 */
export function SampleDataSettings() {
  const sample = useSampleData();

  if (!sample.isAvailable) {
    return null;
  }

  return (
    <Panel elevated padding="lg" className="settings-panel">
      <div className="settings-panel__heading">
        <h2 className="settings-panel__title">Sample data</h2>
        <Badge variant="neutral">
          <FlaskConical size={12} aria-hidden="true" /> Development build
        </Badge>
      </div>
      <p className="settings-panel__lead">
        The fictional dataset used to build the app — Shadowfest years, Moonlight Manor and the
        rest. Every row is flagged as sample data, so clearing it never touches anything real.
        {sample.hasSampleData
          ? " It is currently in the database."
          : " It is not currently loaded."}
      </p>

      <div className="settings-panel__actions">
        <Button
          variant="secondary"
          leadingIcon={<RotateCcw size={16} />}
          onClick={() => void sample.reseed()}
          disabled={sample.isBusy || sample.isLoading}
        >
          Reset sample data
        </Button>
        <Button
          variant="ghost"
          leadingIcon={<Trash2 size={16} />}
          onClick={() => void sample.clear()}
          disabled={sample.isBusy || sample.isLoading || !sample.hasSampleData}
        >
          Clear sample data
        </Button>
      </div>

      {sample.error && (
        <p className="settings-message settings-message--error" role="alert">
          <CircleAlert size={15} aria-hidden="true" />
          {sample.error}
        </p>
      )}
      {sample.message && (
        <p className="settings-message settings-message--ok" role="status">
          <CircleCheck size={15} aria-hidden="true" />
          {sample.message}
        </p>
      )}
    </Panel>
  );
}
