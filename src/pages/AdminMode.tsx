import { useState } from "react";
import { CircleAlert, DoorOpen, Pencil, Plus, ShieldOff, Trash2, TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/admin";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  Panel,
} from "../components/ui";
import { useAdminArchive, type AdminAttractionRow } from "../hooks/useAdminArchive";
import { useAdminMode } from "../hooks/useAdminMode";
import type { EventYear } from "../models/eventYear";
import { formatScore } from "../utils/formatScore";
import "./AdminMode.css";

function AdminDisabled() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Admin Mode" subtitle="Manage archive data." />
      <EmptyState
        icon={<ShieldOff size={24} />}
        title="Admin Mode is off"
        description="Archive records are read-only. Turn Admin Mode on in Settings to add, edit or remove them."
        action={
          <Button variant="secondary" onClick={() => navigate("/settings")}>
            Open Settings
          </Button>
        }
      />
    </>
  );
}

function YearRow({
  year,
  attractionCount,
  onEdit,
  onDelete,
}: {
  year: EventYear;
  attractionCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Deleting an event year cascades to its attractions in the schema, and
  // those cascade to their reviews — so a year is only removable once empty.
  const removable = attractionCount === 0;

  return (
    <li className="admin-row">
      <div className="admin-row__text">
        <span className="admin-row__title">{year.name}</span>
        <span className="admin-row__detail">
          {year.calendarYear} · {attractionCount}{" "}
          {attractionCount === 1 ? "attraction" : "attractions"}
        </span>
      </div>
      <div className="admin-row__actions">
        <Button variant="secondary" size="sm" leadingIcon={<Pencil size={14} />} onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Trash2 size={14} />}
          onClick={onDelete}
          disabled={!removable}
          title={
            removable
              ? undefined
              : "Move or delete this year's attractions first — deleting the year would take them, and their reviews, with it."
          }
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

function AttractionRow({
  row,
  onEdit,
  onDelete,
}: {
  row: AdminAttractionRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attraction, eventYear, ratingTotal } = row;
  const Icon = attraction.attractionType === "house" ? DoorOpen : TreePine;

  return (
    <li className="admin-row">
      <span className="admin-row__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      <div className="admin-row__text">
        <span className="admin-row__title">{attraction.name}</span>
        <span className="admin-row__detail">
          {eventYear ? `${eventYear.calendarYear} · ` : ""}
          {attraction.parkIds.join(", ") || "no park"}
        </span>
      </div>
      {ratingTotal !== null && (
        <Badge variant="positive">Reviewed {formatScore(ratingTotal)}</Badge>
      )}
      <div className="admin-row__actions">
        <Button variant="secondary" size="sm" leadingIcon={<Pencil size={14} />} onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" leadingIcon={<Trash2 size={14} />} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
}

export function AdminMode() {
  const [adminMode] = useAdminMode();
  const navigate = useNavigate();
  const {
    isLoading,
    error,
    years,
    attractions,
    attractionCountByYear,
    createYear,
    deleteYear,
    deleteAttraction,
  } = useAdminArchive();

  const [newYearName, setNewYearName] = useState("");
  const [newYearNumber, setNewYearNumber] = useState("");
  const [yearError, setYearError] = useState<string | null>(null);
  const [deletingYear, setDeletingYear] = useState<EventYear | null>(null);
  const [deletingAttraction, setDeletingAttraction] = useState<AdminAttractionRow | null>(null);

  if (!adminMode) {
    return <AdminDisabled />;
  }

  const handleAddYear = async () => {
    setYearError(null);
    try {
      await createYear({ calendarYear: Number(newYearNumber), name: newYearName.trim() });
      setNewYearName("");
      setNewYearNumber("");
    } catch (caught) {
      setYearError(caught instanceof Error ? caught.message : "Couldn't add that year.");
    }
  };

  return (
    <div className="admin">
      <PageHeader
        title="Admin Mode"
        subtitle="Add, correct and expand the archive. Your ratings and notes are never edited here."
        actions={
          <div className="admin__header-actions">
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={14} />}
              onClick={() => navigate("/admin/attractions/new?type=house")}
            >
              Add House
            </Button>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={14} />}
              onClick={() => navigate("/admin/attractions/new?type=scare_zone")}
            >
              Add Scare Zone
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading the archive…" />
      ) : error ? (
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Couldn't load the archive"
          description={error}
        />
      ) : (
        <>
          <Panel elevated padding="lg" className="admin__section">
            <h2 className="admin__section-title">Event years</h2>

            {years.length > 0 && (
              <ul className="admin__list">
                {years.map((year) => (
                  <YearRow
                    key={year.id}
                    year={year}
                    attractionCount={attractionCountByYear.get(year.id) ?? 0}
                    onEdit={() => navigate(`/admin/years/${year.id}`)}
                    onDelete={() => setDeletingYear(year)}
                  />
                ))}
              </ul>
            )}

            <div className="admin__form">
              <Input
                label="Year"
                type="number"
                value={newYearNumber}
                onChange={(event) => setNewYearNumber(event.target.value)}
                className="admin__form-year"
              />
              <Input
                label="Event name"
                value={newYearName}
                onChange={(event) => setNewYearName(event.target.value)}
                className="admin__form-grow"
              />
              <Button
                variant="secondary"
                leadingIcon={<Plus size={14} />}
                onClick={() => void handleAddYear()}
              >
                Add year
              </Button>
            </div>

            {yearError && (
              <p className="admin-error" role="alert">
                {yearError}
              </p>
            )}
          </Panel>

          <Panel elevated padding="lg" className="admin__section">
            <h2 className="admin__section-title">Attractions</h2>
            {attractions.length === 0 ? (
              <p className="admin__empty">
                Nothing in the archive yet — add a house or a scare zone to start.
              </p>
            ) : (
              <ul className="admin__list">
                {attractions.map((row) => (
                  <AttractionRow
                    key={row.attraction.id}
                    row={row}
                    onEdit={() => navigate(`/admin/attractions/${row.attraction.id}`)}
                    onDelete={() => setDeletingAttraction(row)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      <ConfirmDialog
        isOpen={deletingYear !== null}
        title="Delete this event year?"
        description={
          deletingYear
            ? `"${deletingYear.name}" has no attractions, so nothing else goes with it.`
            : undefined
        }
        confirmLabel="Delete year"
        onConfirm={async () => {
          if (deletingYear) {
            await deleteYear(deletingYear.id);
            setDeletingYear(null);
          }
        }}
        onCancel={() => setDeletingYear(null)}
      />

      <ConfirmDialog
        isOpen={deletingAttraction !== null}
        title="Delete this attraction?"
        description={
          deletingAttraction
            ? `"${deletingAttraction.attraction.name}" and everything recorded about it — characters, sources, media and links — will be removed.`
            : undefined
        }
        confirmLabel="Delete attraction"
        onConfirm={async () => {
          if (deletingAttraction) {
            await deleteAttraction(deletingAttraction.attraction.id);
            setDeletingAttraction(null);
          }
        }}
        onCancel={() => setDeletingAttraction(null)}
      >
        {deletingAttraction &&
          (deletingAttraction.ratingTotal !== null || deletingAttraction.hasNote) && (
            <p className="admin__danger" role="alert">
              This also deletes your own review of it
              {deletingAttraction.ratingTotal !== null &&
                ` (${formatScore(deletingAttraction.ratingTotal)} / 15)`}
              {deletingAttraction.hasNote && " and the note you wrote about it"}. That can&rsquo;t
              be undone.
            </p>
          )}
      </ConfirmDialog>
    </div>
  );
}
