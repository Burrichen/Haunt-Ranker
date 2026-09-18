import { Panel, SegmentedControl, Toggle } from "../ui";
import { useAmbientEffectsPreference } from "../../hooks/useAmbientEffectsPreference";
import { useAttractionViewMode, type AttractionViewMode } from "../../hooks/useAttractionViewMode";
import { useMotionPreference, type MotionPreference } from "../../hooks/useMotionPreference";
import "./SettingsPanels.css";

const MOTION_OPTIONS: Array<{ value: MotionPreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "reduce", label: "Reduce" },
  { value: "full", label: "Full" },
];

const VIEW_OPTIONS: Array<{ value: AttractionViewMode; label: string }> = [
  { value: "card", label: "Cards" },
  { value: "compact", label: "Compact" },
];

export function AppearanceSettings() {
  const [ambientEffects, setAmbientEffects] = useAmbientEffectsPreference();
  const {
    preference: motion,
    setPreference: setMotion,
    systemPrefersReduced,
  } = useMotionPreference();
  const [viewMode, setViewMode] = useAttractionViewMode();

  return (
    <Panel elevated padding="lg" className="settings-panel">
      <h2 className="settings-panel__title">Appearance</h2>

      <Toggle
        checked={ambientEffects}
        onChange={setAmbientEffects}
        label="Ambient effects"
        description="The atmospheric background — the corner glow, the stars, the treeline and the bats. Purely decorative; turning it off changes nothing else."
      />

      <div className="settings-field">
        <div className="settings-field__text">
          <span className="settings-field__label">Motion</span>
          <p className="settings-field__description">
            System follows your Windows animation setting
            {systemPrefersReduced ? ", which currently asks for less motion" : ""}. Reduce stops the
            app&rsquo;s animations; Full keeps them even where Windows asks for less.
          </p>
        </div>
        <SegmentedControl
          options={MOTION_OPTIONS}
          value={motion}
          onChange={setMotion}
          aria-label="Motion"
        />
      </div>

      <div className="settings-field">
        <div className="settings-field__text">
          <span className="settings-field__label">Attraction lists</span>
          <p className="settings-field__description">
            How Houses, Scare Zones and year pages list attractions. The same choice is on those
            pages — this is the one it remembers.
          </p>
        </div>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          aria-label="Attraction lists"
        />
      </div>
    </Panel>
  );
}
