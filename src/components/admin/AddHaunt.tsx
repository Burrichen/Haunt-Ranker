import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Check,
  ClipboardCopy,
  FileJson,
  Info,
  PackagePlus,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHauntPackImport, type HauntPackImportState } from "../../hooks/useHauntPackImport";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { useResearchPrompt, type ResearchPromptState } from "../../hooks/useResearchPrompt";
import { currentPackFormat, renderPackFormat } from "../../packs/packFormat";
import { copyText } from "../../utils/clipboard";
import { Button, Input, Panel, SegmentedControl, Textarea } from "../ui";
import { HauntPackImportBody } from "./HauntPackImport";
import "../settings/SettingsPanels.css";
import "./HauntPackImport.css";
import "./AddHaunt.css";

type Route = "import" | "manual" | "research";

const ROUTES: Array<{ value: Route; label: string; icon: ReactNode }> = [
  { value: "import", label: "Import Haunt Pack", icon: <PackagePlus size={14} /> },
  { value: "manual", label: "Create Manually", icon: <Pencil size={14} /> },
  { value: "research", label: "Generate Research Prompt", icon: <Sparkles size={14} /> },
];

type CopyState = "idle" | "copied" | "failed";

/**
 * A copy button that says whether it worked. When the clipboard refuses,
 * the text it was meant to copy is selected instead, so Ctrl+C still does.
 */
function CopyButton({
  text,
  label,
  fallbackTarget,
  variant = "primary",
}: {
  text: string;
  label: string;
  fallbackTarget?: RefObject<HTMLTextAreaElement | null>;
  variant?: "primary" | "secondary";
}) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state !== "copied") {
      return;
    }
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  const handleCopy = async () => {
    if (await copyText(text)) {
      setState("copied");
      return;
    }
    setState("failed");
    fallbackTarget?.current?.focus();
    fallbackTarget?.current?.select();
  };

  return (
    <span className="add-haunt__copy">
      <Button
        variant={variant}
        leadingIcon={state === "copied" ? <Check size={16} /> : <ClipboardCopy size={16} />}
        onClick={() => void handleCopy()}
      >
        {state === "copied" ? "Copied" : label}
      </Button>
      {state === "failed" && (
        <span className="add-haunt__copy-failed" role="alert">
          Couldn&rsquo;t reach the clipboard. The text is selected — press Ctrl+C to copy it.
        </span>
      )}
    </span>
  );
}

/** The format, for anyone who wants it — closed until opened. */
function PackFormatReference() {
  const format = useMemo(() => currentPackFormat(), []);
  const reference = useMemo(() => renderPackFormat(format), [format]);
  const referenceRef = useRef<HTMLTextAreaElement>(null);

  return (
    <details className="add-haunt__format">
      <summary>
        <FileJson size={14} aria-hidden="true" />
        View Haunt Pack Format
      </summary>
      <div className="add-haunt__format-body">
        <p className="pack-import__lead">
          For writing or checking a pack by hand. This build reads <code>{format.schema}</code>; the
          research prompt always describes this same version.
        </p>
        <CopyButton
          text={reference}
          label="Copy Schema"
          variant="secondary"
          fallbackTarget={referenceRef}
        />
        <Textarea
          ref={referenceRef}
          label="Haunt Pack format"
          readOnly
          rows={16}
          spellCheck={false}
          className="pack-import__textarea"
          value={reference}
        />
      </div>
    </details>
  );
}

function ResearchRoute({
  importer,
  research,
}: {
  importer: HauntPackImportState;
  research: ResearchPromptState;
}) {
  const registry = useHauntRegistry();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const { prompt } = research;

  return (
    <div className="add-haunt__route">
      <p className="pack-import__lead">
        Haunt Ranker doesn&rsquo;t research anything itself and never sends anything anywhere. It
        writes a prompt you can give to ChatGPT, Claude or any assistant you already use. The prompt
        tells the assistant what a Haunt Pack is and how the research has to be sourced, and what
        comes back is checked here before any of it is imported.
      </p>

      <ol className="add-haunt__steps" aria-label="How it works">
        <li>Copy the research prompt.</li>
        <li>Ask your preferred assistant to research the event.</li>
        <li>Copy the resulting Haunt Pack.</li>
        <li>Paste it into Haunt Ranker.</li>
        <li>Review validation.</li>
        <li>Import.</li>
      </ol>

      <section className="add-haunt__step" aria-labelledby="add-haunt-prompt">
        <h3 id="add-haunt-prompt" className="add-haunt__step-title">
          Generate Research Prompt
        </h3>
        <div className="add-haunt__form">
          <Input
            label="Haunt name"
            placeholder="Knott's Scary Farm"
            list="add-haunt-installed"
            value={research.hauntName}
            error={research.errors.hauntName}
            onChange={(event) => research.setHauntName(event.target.value)}
            className="add-haunt__form-grow"
          />
          <datalist id="add-haunt-installed">
            {registry.haunts.map((haunt) => (
              <option key={haunt.id} value={haunt.name} />
            ))}
          </datalist>
          <Input
            label="Years"
            placeholder="2024–2026"
            value={research.years}
            error={research.errors.years}
            onChange={(event) => research.setYears(event.target.value)}
            className="add-haunt__form-years"
          />
        </div>
        <Textarea
          label="Optional notes"
          hint="Anything the assistant should know: scope, sources to prefer, what to leave out."
          rows={2}
          value={research.notes}
          onChange={(event) => research.setNotes(event.target.value)}
        />
        <div className="pack-import__actions">
          <Button
            variant={prompt ? "secondary" : "primary"}
            leadingIcon={<Sparkles size={16} />}
            onClick={() => void research.generate()}
            disabled={research.isBusy}
          >
            {research.isBusy ? "Writing…" : prompt ? "Regenerate prompt" : "Generate prompt"}
          </Button>
          {prompt && (
            <CopyButton text={prompt.text} label="Copy Prompt" fallbackTarget={promptRef} />
          )}
        </div>

        {prompt?.existing && (
          <p className="add-haunt__context" role="status">
            <Info size={14} aria-hidden="true" />
            <span>
              {prompt.existing.name} is already in your archive, so the prompt gives the assistant
              its existing ids — {prompt.existing.seasons.length}{" "}
              {prompt.existing.seasons.length === 1 ? "season" : "seasons"} and{" "}
              {prompt.existing.experiences.length}{" "}
              {prompt.existing.experiences.length === 1 ? "experience" : "experiences"} for these
              years — so the pack adds to what&rsquo;s here instead of duplicating it.
            </span>
          </p>
        )}
        {prompt?.archiveUnread && (
          <p className="add-haunt__context" role="status">
            <Info size={14} aria-hidden="true" />
            <span>
              The archive couldn&rsquo;t be read, so the prompt doesn&rsquo;t include ids for
              anything already installed.
            </span>
          </p>
        )}

        {prompt && (
          <Textarea
            ref={promptRef}
            label="Research prompt"
            hint="Paste this into a new conversation with an assistant that can browse the web."
            readOnly
            rows={8}
            spellCheck={false}
            className="pack-import__textarea"
            value={prompt.text}
          />
        )}
      </section>

      <section className="add-haunt__step" aria-labelledby="add-haunt-paste">
        <h3 id="add-haunt-paste" className="add-haunt__step-title">
          Paste Haunt Pack
        </h3>
        <HauntPackImportBody
          importer={importer}
          allowFile={false}
          label="Haunt Pack from your assistant"
          hint="Paste the JSON the assistant returned. A surrounding ```json code block is fine. Nothing is written until you import."
        />
      </section>
    </div>
  );
}

function ManualRoute() {
  const navigate = useNavigate();
  const registry = useHauntRegistry();

  return (
    <div className="add-haunt__route">
      <p className="pack-import__lead">
        Add a season or an experience to a haunt that&rsquo;s already installed —{" "}
        {registry.haunts.map((haunt) => haunt.name).join(", ") || "none yet"}. A haunt that
        isn&rsquo;t installed yet arrives as a Haunt Pack, which you can write by hand or have an
        assistant research.
      </p>
      <div className="pack-import__actions">
        <Button
          variant="secondary"
          leadingIcon={<Plus size={16} />}
          onClick={() =>
            document
              .getElementById("admin-event-years")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Add a season
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<Plus size={16} />}
          onClick={() => navigate("/admin/attractions/new?type=house")}
        >
          Add House
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<Plus size={16} />}
          onClick={() => navigate("/admin/attractions/new?type=scare_zone")}
        >
          Add Scare Zone
        </Button>
      </div>
    </div>
  );
}

export interface AddHauntProps {
  /** Called once an import lands, so the interface can pick up what is new. */
  onImported?: () => void | Promise<void>;
}

/**
 * Admin → Add a Haunt: import a pack, add records by hand, or have an
 * assistant research one.
 *
 * The routes share one importer and one research form, so a pack pasted
 * or a prompt written on one tab is still there after visiting another, and every route that ends in an import ends in the
 * same validation and the same preview.
 */
export function AddHaunt({ onImported }: AddHauntProps) {
  const importer = useHauntPackImport(onImported);
  const research = useResearchPrompt();
  const [route, setRoute] = useState<Route>("import");

  return (
    <Panel elevated padding="lg" className="admin__section pack-import add-haunt">
      <h2 className="admin__section-title">Add a Haunt</h2>
      <SegmentedControl
        aria-label="How to add a haunt"
        value={route}
        onChange={setRoute}
        options={ROUTES}
      />

      {route === "import" && (
        <div className="add-haunt__route">
          <p className="pack-import__lead">
            A Haunt Pack is a single JSON file describing an event, its seasons and everything in
            them. Open one or paste it below — it is checked completely before anything is written,
            and you see what it would change before it changes it.
          </p>
          <HauntPackImportBody importer={importer} />
        </div>
      )}
      {route === "manual" && <ManualRoute />}
      {route === "research" && <ResearchRoute importer={importer} research={research} />}

      {route !== "manual" && <PackFormatReference />}
    </Panel>
  );
}
