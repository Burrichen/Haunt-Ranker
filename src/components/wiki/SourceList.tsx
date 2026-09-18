import { openUrl } from "@tauri-apps/plugin-opener";
import {
  BookOpen,
  ExternalLink,
  Globe,
  Link2,
  Megaphone,
  Mic,
  Newspaper,
  PlayCircle,
  Share2,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Source, SourceType } from "../../models/source";
import { Badge } from "../ui";
import "./SourceList.css";

export interface SourceListProps {
  sources: Source[];
}

const SOURCE_ICON: Record<SourceType, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  youtube: PlayCircle,
  article: Newspaper,
  official_site: Globe,
  promotional: Megaphone,
  book: BookOpen,
  podcast: Mic,
  interview: Users,
  social_media: Share2,
  other: Link2,
};

/** lucide-react has no brand icon for YouTube — this label is what actually identifies a source as YouTube. */
const SOURCE_LABEL: Record<SourceType, string> = {
  youtube: "YouTube",
  article: "Article",
  official_site: "Official Site",
  promotional: "Promotional Material",
  book: "Book",
  podcast: "Podcast",
  interview: "Interview",
  social_media: "Social Media",
  other: "Source",
};

/**
 * Opens a source's URL via the Tauri opener plugin, which hands it to the
 * system's default browser rather than navigating this window away — the
 * app never loads arbitrary external sites inside its own webview.
 */
async function handleOpen(url: string) {
  try {
    await openUrl(url);
  } catch {
    // Opener unavailable (e.g. outside a Tauri window) — fail silently
    // rather than navigating this window to an external URL.
  }
}

function SourceListItem({ source }: { source: Source }) {
  const Icon = SOURCE_ICON[source.sourceType];
  const url = source.url;

  return (
    <li className="source-list__item">
      <span className="source-list__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      <div className="source-list__body">
        {url ? (
          <button
            type="button"
            className="source-list__title source-list__title--link"
            onClick={() => void handleOpen(url)}
          >
            {source.title}
            <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <span className="source-list__title">{source.title}</span>
        )}
        <div className="source-list__meta">
          <Badge variant="neutral">{SOURCE_LABEL[source.sourceType]}</Badge>
          {source.publisher && <span className="source-list__publisher">{source.publisher}</span>}
        </div>
      </div>
    </li>
  );
}

export function SourceList({ sources }: SourceListProps) {
  return (
    <ul className="source-list">
      {sources.map((source) => (
        <SourceListItem key={source.id} source={source} />
      ))}
    </ul>
  );
}
