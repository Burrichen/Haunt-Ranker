import { useAmbientEffectsPreference } from "../../hooks/useAmbientEffectsPreference";
import "./Atmosphere.css";

const STAR_POSITIONS = [
  { top: "18%", left: "8%" },
  { top: "9%", left: "22%" },
  { top: "24%", left: "35%" },
  { top: "12%", left: "48%" },
  { top: "20%", left: "61%" },
  { top: "8%", left: "74%" },
  { top: "17%", left: "85%" },
  { top: "28%", left: "93%" },
  { top: "35%", left: "16%" },
  { top: "33%", left: "68%" },
];

/**
 * Purely decorative background layer: drifting corner glow, faint stars, a
 * distant treeline and a couple of tiny bats. Fixed behind the app shell,
 * never intercepts pointer events, and stays subtle enough that it never
 * competes with panel content for readability.
 *
 * Deliberately avoids `background: radial-gradient(...)` and any blur
 * effect spanning most of the viewport (e.g. a full-bleed vignette) — on at
 * least one WebView2/GPU combination we test against, large soft-edged
 * regions rasterize as corrupted jagged shapes instead of a smooth fade.
 * Small blurred elements (the corner glows below) render cleanly, so the
 * glow is built from layered `box-shadow` blur on a small element rather
 * than one huge gradient or shadow spanning the whole screen.
 */
export function Atmosphere() {
  const [enabled] = useAmbientEffectsPreference();

  if (!enabled) {
    return null;
  }

  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere__glow atmosphere__glow--orange" />
      <div className="atmosphere__glow atmosphere__glow--purple" />
      <div className="atmosphere__stars">
        {STAR_POSITIONS.map((position, index) => (
          <span key={index} className="atmosphere__star" style={position} />
        ))}
      </div>
      <span className="atmosphere__bat atmosphere__bat--one" />
      <span className="atmosphere__bat atmosphere__bat--two" />
      <svg
        className="atmosphere__treeline"
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
        focusable="false"
      >
        <polygon
          fill="currentColor"
          points="0,14 0,8.4 5,5.6 10,7.7 15,4.2 20,7 28,2.8 34,6.3 40,3.5 46,7 52,2.1 58,5.6 64,3.1 70,6.7 76,2.5 82,5.9 88,3.5 94,6.3 100,4.2 100,14"
        />
      </svg>
    </div>
  );
}
