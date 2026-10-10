import { BACKUP_FORMAT_VERSION } from "../../models/backup";
import { SCHEMA_VERSION } from "../../database/schemaVersion";
import { APP_VERSION } from "../../version";
import { Panel } from "../ui";
import "./SettingsPanels.css";

export function AboutSettings() {
  return (
    <Panel elevated padding="lg" className="settings-panel">
      <h2 className="settings-panel__title">About</h2>

      <dl className="settings-stats">
        <div className="settings-stats__item">
          <dt>Haunt Ranker</dt>
          <dd>{APP_VERSION}</dd>
        </div>
        <div className="settings-stats__item">
          <dt>Data schema</dt>
          <dd>version {SCHEMA_VERSION}</dd>
        </div>
        <div className="settings-stats__item">
          <dt>Backup format</dt>
          <dd>version {BACKUP_FORMAT_VERSION}</dd>
        </div>
      </dl>

      <p className="settings-panel__footnote">
        Everything lives on this machine: one SQLite database, your own image files, and whatever
        backups you write. There is no account and no server. Nothing about you leaves the app. It
        goes online only to save the archive&rsquo;s artwork for offline use after an update
        (Settings → Archive), and external links open in your browser.
      </p>
    </Panel>
  );
}
