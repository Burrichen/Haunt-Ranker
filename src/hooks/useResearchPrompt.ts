import { useCallback, useState } from "react";
import { getDatabase } from "../database/client";
import {
  buildResearchPrompt,
  existingHauntContext,
  matchInstalledHaunt,
  parseYears,
  type ExistingHauntContext,
} from "../packs/researchPrompt";
import { createHauntPackRepository } from "../repositories/hauntPackRepository";

export interface GeneratedPrompt {
  text: string;
  /** Set when the haunt is already installed, and the prompt carries its ids. */
  existing: ExistingHauntContext | null;
  /** True when the archive couldn't be read, so installed ids aren't included. */
  archiveUnread: boolean;
}

export interface ResearchPromptState {
  hauntName: string;
  setHauntName: (value: string) => void;
  years: string;
  setYears: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  /** What's wrong with the form, field by field, after an attempt to generate. */
  errors: { hauntName?: string; years?: string };
  isBusy: boolean;
  prompt: GeneratedPrompt | null;
  generate: () => Promise<void>;
}

/**
 * Admin → Add a Haunt → Generate Research Prompt.
 *
 * Reads the archive once per prompt, for one reason: if the haunt is
 * already installed, the prompt has to hand the assistant the ids it
 * already has, or the pack that comes back would duplicate every record it
 * describes. Nothing is written, and nothing leaves the machine — the
 * prompt goes wherever the person pastes it.
 */
export function useResearchPrompt(): ResearchPromptState {
  const [hauntName, setHauntNameValue] = useState("");
  const [years, setYearsValue] = useState("");
  const [notes, setNotesValue] = useState("");
  const [errors, setErrors] = useState<ResearchPromptState["errors"]>({});
  const [isBusy, setIsBusy] = useState(false);
  const [prompt, setPrompt] = useState<GeneratedPrompt | null>(null);

  // A prompt describes the request it was made from. Changing the request
  // retires it, so nobody copies a prompt for last year's form.
  const setHauntName = useCallback((value: string) => {
    setHauntNameValue(value);
    setPrompt(null);
  }, []);
  const setYears = useCallback((value: string) => {
    setYearsValue(value);
    setPrompt(null);
  }, []);
  const setNotes = useCallback((value: string) => {
    setNotesValue(value);
    setPrompt(null);
  }, []);

  const generate = useCallback(async () => {
    const name = hauntName.trim();
    const parsed = parseYears(years);
    const nextErrors: ResearchPromptState["errors"] = {};
    if (name === "") {
      nextErrors.hauntName = "Enter the haunt's name.";
    }
    if (!parsed.ok) {
      nextErrors.years = parsed.error;
    }
    setErrors(nextErrors);
    if (!parsed.ok || name === "") {
      setPrompt(null);
      return;
    }

    setIsBusy(true);
    let existing: ExistingHauntContext | null = null;
    let archiveUnread = false;
    try {
      const state = await createHauntPackRepository(await getDatabase()).readState();
      const hauntId = matchInstalledHaunt(state, name);
      existing = hauntId ? existingHauntContext(state, hauntId, parsed.years) : null;
    } catch {
      // The prompt is still worth having without the archive's ids; the
      // person is told they aren't in it.
      archiveUnread = true;
    }
    setPrompt({
      text: buildResearchPrompt({ hauntName: name, years: parsed.years, notes, existing }),
      existing,
      archiveUnread,
    });
    setIsBusy(false);
  }, [hauntName, years, notes]);

  return {
    hauntName,
    setHauntName,
    years,
    setYears,
    notes,
    setNotes,
    errors,
    isBusy,
    prompt,
    generate,
  };
}
