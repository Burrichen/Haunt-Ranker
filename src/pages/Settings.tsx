import { Link } from "react-router-dom";
import {
  AboutSettings,
  AppearanceSettings,
  DataSettings,
  SampleDataSettings,
} from "../components/settings";
import { PageHeader, Panel, Toggle } from "../components/ui";
import { useAdminMode } from "../hooks/useAdminMode";
import "./Settings.css";

export function Settings() {
  const [adminMode, setAdminMode] = useAdminMode();

  return (
    <div className="settings">
      <PageHeader
        title="Settings"
        subtitle="How the app looks, what it stores, and how to take your data with you."
      />

      <AppearanceSettings />
      <DataSettings />
      <SampleDataSettings />

      <Panel elevated padding="lg" className="settings__section">
        <h2 className="settings__section-title">Admin</h2>

        <Toggle
          checked={adminMode}
          onChange={setAdminMode}
          label="Admin Mode"
          description="Lets you add, edit and delete archive records — attractions, event years, characters, sources and media. Off by default, so archive facts stay read-only until you ask for them not to be. Your ratings and notes are never touched by this."
        />

        {adminMode && (
          <p className="settings__hint">
            Editing tools are now in the sidebar under{" "}
            <Link to="/admin" className="settings__link">
              Admin Mode
            </Link>
            , and each attraction&rsquo;s wiki page has an Edit button.
          </p>
        )}
      </Panel>

      <AboutSettings />
    </div>
  );
}
