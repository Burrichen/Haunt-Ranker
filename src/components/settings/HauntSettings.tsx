import { useHauntScope } from "../../hooks/useHauntScope";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import type { HauntScope } from "../../models/haunt";
import { Panel, SegmentedControl } from "../ui";
import "./SettingsPanels.css";

/**
 * Which collection the app opens on.
 *
 * Halloween Horror Nights is the default because it is the collection Haunt
 * Ranker was built around, not because the others are lesser — this is
 * where anyone who reads it differently says so, once.
 */
export function HauntSettings() {
  const { defaultScope, setDefaultScope } = useHauntScope();
  const registry = useHauntRegistry();

  const options = registry.scopes().map((scope: HauntScope) => ({
    value: scope,
    label: registry.scopeLabel(scope, scope === "all" ? "full" : "short"),
  }));

  return (
    <Panel elevated padding="lg" className="settings-panel">
      <h2 className="settings-panel__title">Haunts</h2>

      <div className="settings-field">
        <div className="settings-field__text">
          <span className="settings-field__label">Default haunt</span>
          <p className="settings-field__description">
            What the app opens on, and what it falls back to. The selector in the sidebar changes
            what you&rsquo;re looking at now and remembers it; this changes where a fresh start
            begins. Choosing one here switches to it straight away.
          </p>
        </div>
        <SegmentedControl
          options={options}
          value={defaultScope}
          onChange={setDefaultScope}
          aria-label="Default haunt"
        />
      </div>
    </Panel>
  );
}
