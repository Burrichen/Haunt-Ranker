import { useState } from "react";
import { CircleAlert, ListOrdered, Plus, RotateCcw, Trophy } from "lucide-react";
import {
  RankingFilterBar,
  RankingList,
  RankingRow,
  RankingSection,
  RankingSortMenu,
} from "../components/rankings";
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Modal,
  PageHeader,
  SegmentedControl,
} from "../components/ui";
import { useRankings } from "../hooks/useRankings";
import type { RankingGroup } from "../models/ranking";
import type { RankingMode } from "../utils/rankings";
import "./Rankings.css";

const GROUP_OPTIONS = [
  { value: "houses" as const, label: "Houses" },
  { value: "scare_zones" as const, label: "Scare Zones" },
  { value: "all" as const, label: "All Attractions" },
];

const MODE_OPTIONS = [
  { value: "calculated" as const, label: "Calculated" },
  { value: "manual" as const, label: "My Ranking" },
];

const GROUP_NOUN: Record<RankingGroup, string> = {
  houses: "houses",
  scare_zones: "scare zones",
  all: "attractions",
};

export function Rankings() {
  const rankings = useRankings();
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const {
    isLoading,
    error,
    group,
    setGroup,
    mode,
    setMode,
    hasManualRanking,
    filters,
    setFilters,
    clearFilters,
    areFiltersActive,
    availableYears,
    sort,
    setSort,
    ranked,
    unplaced,
    unrated,
    isSaving,
    saveError,
    reorder,
    addToRanking,
    resetToCalculated,
  } = rankings;

  const isManual = mode === "manual";
  const noun = GROUP_NOUN[group];

  const handleReset = async () => {
    await resetToCalculated();
    setIsConfirmingReset(false);
  };

  return (
    <div className="rankings">
      <PageHeader
        title="Rankings"
        subtitle="Your attractions in order — by score, or however you say."
      />

      <div className="rankings__toolbar">
        <SegmentedControl
          options={GROUP_OPTIONS}
          value={group}
          onChange={(next: RankingGroup) => setGroup(next)}
          aria-label="Ranking group"
        />
        <div className="rankings__toolbar-end">
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={(next: RankingMode) => setMode(next)}
            aria-label="Ranking mode"
          />
          <RankingSortMenu sort={sort} onChange={setSort} disabled={isManual} />
        </div>
      </div>

      <RankingFilterBar
        filters={filters}
        onChange={setFilters}
        availableYears={availableYears}
        showTypeFilter={group === "all"}
        isActive={areFiltersActive}
        onClear={clearFilters}
      />

      {isManual ? (
        <div className="rankings__notice">
          <Badge variant="purple">
            <ListOrdered size={11} strokeWidth={2} />
            {hasManualRanking ? "Manual order active" : "Manual order — not saved yet"}
          </Badge>
          <p className="rankings__notice-text">
            {hasManualRanking
              ? "This is your own order. Scores can change without moving anything here."
              : `Starting from the calculated order. Drag a row or use the arrows and your order is saved.`}
          </p>
          {hasManualRanking && (
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<RotateCcw size={14} />}
              onClick={() => setIsConfirmingReset(true)}
            >
              Reset to Calculated Ranking
            </Button>
          )}
        </div>
      ) : (
        hasManualRanking && (
          <div className="rankings__notice">
            <Badge variant="neutral">Calculated view</Badge>
            <p className="rankings__notice-text">
              You have a saved ranking for these {noun}. Sorting here is just a different view of
              the scores — it never changes it.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setMode("manual")}>
              Back to My Ranking
            </Button>
          </div>
        )
      )}

      {saveError && (
        <p className="rankings__error" role="alert">
          {saveError}
        </p>
      )}

      {isLoading ? (
        <LoadingState label="Loading your rankings…" />
      ) : error ? (
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Couldn't load your rankings"
          description={error}
        />
      ) : (
        <>
          {ranked.length === 0 ? (
            <EmptyState
              icon={<Trophy size={24} />}
              title={areFiltersActive ? "No matches" : `Nothing to rank yet`}
              description={
                areFiltersActive
                  ? "No rated attractions match these filters."
                  : `Rate some ${noun} and they'll line up here.`
              }
            />
          ) : (
            <RankingList
              rows={ranked}
              isManual={isManual}
              onReorder={(from, to) => void reorder(from, to)}
            />
          )}

          {unplaced.length > 0 && (
            <RankingSection
              title="Not yet placed"
              count={unplaced.length}
              description="Rated since you made this ranking. They stay out of it until you add them, so nothing shuffles behind your back."
            >
              <ol className="rankings__side-list">
                {unplaced.map((row) => (
                  <RankingRow
                    key={row.attraction.id}
                    row={row}
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        leadingIcon={<Plus size={14} />}
                        disabled={isSaving}
                        onClick={() => void addToRanking(row.attraction.id)}
                      >
                        Add to ranking
                      </Button>
                    }
                  />
                ))}
              </ol>
            </RankingSection>
          )}

          {unrated.length > 0 && (
            <RankingSection
              title="Unrated"
              count={unrated.length}
              description="Kept out of the ranking entirely — an unrated attraction isn't a zero."
            >
              <ol className="rankings__side-list">
                {unrated.map((row) => (
                  <RankingRow key={row.attraction.id} row={row} />
                ))}
              </ol>
            </RankingSection>
          )}
        </>
      )}

      <Modal
        isOpen={isConfirmingReset}
        onClose={() => setIsConfirmingReset(false)}
        title="Reset to Calculated Ranking?"
        description={`Your manual order for these ${noun} is deleted and the list goes back to score order. This can't be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirmingReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isSaving} onClick={() => void handleReset()}>
              Reset ranking
            </Button>
          </>
        }
      />
    </div>
  );
}
