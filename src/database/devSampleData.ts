/**
 * ============================================================================
 * DEVELOPMENT SAMPLE DATA — 100% FICTIONAL — NOT REAL HHN FACTS
 * ============================================================================
 *
 * Everything created by `seedDevSampleData` below (event years, houses,
 * scare zones, characters, sources, media, ratings...) is invented for
 * development purposes only, so the UI can be built and exercised against
 * realistic-looking records before any real Halloween Horror Nights data
 * exists in this app. None of it describes real attractions, and it must
 * never be treated as factual content.
 *
 * Every row this module creates is marked `is_sample = 1` (see
 * `src-tauri/migrations/0004_add_sample_data_flag.sql`) specifically so it
 * can be identified and removed with `clearDevSampleData` before real data
 * is ever imported. Run `npm run db:clear` (or `db:reset`) to do that.
 *
 * Media URLs deliberately point at `example.invalid` (a domain reserved by
 * RFC 2606 to never resolve) rather than any real image — this is sample
 * *metadata* about artwork, never an actual bundled asset, and the
 * `licenseNotes` on each says so explicitly.
 */

import type { EntityId } from "../models/common";
import type { SqlExecutor } from "./types";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createAttractionRelationRepository } from "../repositories/attractionRelationRepository";
import { createCharacterRepository } from "../repositories/characterRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createNoteRepository } from "../repositories/noteRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createSourceRepository } from "../repositories/sourceRepository";
import { allTimeScope } from "../models/ranking";
import type { AttractionInput } from "../models/attraction";
import type { ParkId } from "../models/park";

const SAMPLE_NOTICE =
  "Sample data for development — fictional, not a real Halloween Horror Nights attraction.";

export interface DevSampleDataSummary {
  eventYears: number;
  attractions: number;
  characters: number;
  sources: number;
  media: number;
  relations: number;
  ratings: number;
  notes: number;
  rankingScopes: number;
}

/** True if any fictional sample data is currently present. */
export async function hasDevSampleData(db: SqlExecutor): Promise<boolean> {
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM event_years WHERE is_sample = 1",
  );
  return rows[0].count > 0;
}

/**
 * Deletes every row marked `is_sample = 1`. Cascades (see
 * 0001/0002_*.sql) take care of characters, park assignments, relations,
 * source/media links, ratings, notes and rankings automatically once their
 * owning attraction or event year is gone — only `sources` has no owning
 * FK of its own, so it's cleared explicitly too.
 */
export async function clearDevSampleData(db: SqlExecutor): Promise<void> {
  await db.execute("DELETE FROM attractions WHERE is_sample = 1");
  await db.execute("DELETE FROM event_years WHERE is_sample = 1");
  await db.execute("DELETE FROM sources WHERE is_sample = 1");
}

/** Clears any existing sample data, then seeds a fresh copy. Safe to run repeatedly. */
export async function resetDevSampleData(db: SqlExecutor): Promise<DevSampleDataSummary> {
  await clearDevSampleData(db);
  return seedDevSampleData(db);
}

/**
 * Creates the fictional development dataset via the repository layer
 * (exercising it the same way real UI code would). Throws if sample data
 * already exists — call `clearDevSampleData` or use `resetDevSampleData`
 * instead of calling this twice in a row.
 */
export async function seedDevSampleData(db: SqlExecutor): Promise<DevSampleDataSummary> {
  if (await hasDevSampleData(db)) {
    throw new Error(
      "Dev sample data already exists. Call clearDevSampleData() first, or use resetDevSampleData().",
    );
  }

  const eventYears = createEventYearRepository(db);
  const attractions = createAttractionRepository(db);
  const characters = createCharacterRepository(db);
  const sources = createSourceRepository(db);
  const media = createMediaRepository(db);
  const relations = createAttractionRelationRepository(db);
  const ratings = createRatingRepository(db);
  const notes = createNoteRepository(db);
  const rankings = createRankingRepository(db);

  // ---------------------------------------------------------------------
  // Event years — fictional "Shadowfest" event, standing in for HHN.
  // ---------------------------------------------------------------------
  const yearIds: Record<"y2101" | "y2102" | "y2103", EntityId> = {
    y2101: (
      await eventYears.create({
        calendarYear: 2101,
        name: "Shadowfest 2101",
        description: `${SAMPLE_NOTICE} A fictional stand-in event used to develop and test Haunt Ranker.`,
        isSample: true,
      })
    ).id,
    y2102: (
      await eventYears.create({
        calendarYear: 2102,
        name: "Shadowfest 2102",
        description: SAMPLE_NOTICE,
        isSample: true,
      })
    ).id,
    y2103: (
      await eventYears.create({
        calendarYear: 2103,
        name: "Shadowfest 2103",
        description: SAMPLE_NOTICE,
        isSample: true,
      })
    ).id,
  };

  // ---------------------------------------------------------------------
  // Attractions — houses and scare zones covering every combination the
  // UI needs to render: Hollywood-only / Orlando-only / dual-park,
  // original / fictional-licensed IP, with/without a variant name.
  // ---------------------------------------------------------------------
  type AttractionKey =
    | "moonlightManor"
    | "radioactiveCrypt"
    | "witheringAsylum"
    | "nightmareCarnivalSecondAct"
    | "pumpkinPier"
    | "midnightCarnival"
    | "graveyardRadio";

  const attractionInputs: Record<AttractionKey, AttractionInput> = {
    moonlightManor: {
      eventYearId: yearIds.y2101,
      attractionType: "house",
      name: "Moonlight Manor",
      slug: "moonlight-manor",
      parkIds: ["hollywood", "orlando"] satisfies ParkId[],
      ipType: "original",
      shortSummary: `${SAMPLE_NOTICE} A crumbling estate haunted by its last owner.`,
      fullOverview:
        "Sample overview: guests explore the halls of a fictional estate whose owner refuses to leave.",
      storyLore: "Sample lore: the Duchess of Moonlight Manor never accepted her own funeral.",
      experienceDescription: "Sample experience notes: slow-build dread, heavy fog, live actors.",
      developmentNotes: "Sample dev notes: an original concept created for this fictional event.",
      openingDate: "2101-09-01",
      closingDate: "2101-10-31",
      locationNotes: "Sample location: fictional back-lot placement, both parks.",
      isSample: true,
    },
    radioactiveCrypt: {
      eventYearId: yearIds.y2101,
      attractionType: "house",
      name: "Radioactive Crypt",
      slug: "radioactive-crypt",
      parkIds: ["hollywood"] satisfies ParkId[],
      ipType: "licensed",
      franchiseName: "Toxic Nightmares (fictional franchise)",
      shortSummary: `${SAMPLE_NOTICE} A fictional tie-in to a made-up horror franchise.`,
      fullOverview:
        "Sample overview: a glowing, mutated crypt themed around the fictional 'Toxic Nightmares' franchise.",
      isSample: true,
    },
    witheringAsylum: {
      eventYearId: yearIds.y2102,
      attractionType: "house",
      name: "The Withering Asylum",
      slug: "the-withering-asylum",
      parkIds: ["orlando"] satisfies ParkId[],
      ipType: "original",
      shortSummary: `${SAMPLE_NOTICE} An abandoned fictional asylum with a static-filled secret.`,
      fullOverview:
        "Sample overview: guests wander a fictional asylum where the intercom never stopped broadcasting.",
      storyLore: "Sample lore: Nurse Static still makes her rounds, decades later.",
      isSample: true,
    },
    nightmareCarnivalSecondAct: {
      eventYearId: yearIds.y2103,
      attractionType: "house",
      name: "Nightmare Carnival: Second Act",
      slug: "nightmare-carnival-second-act",
      variantName: "Second Act",
      parkIds: ["hollywood", "orlando"] satisfies ParkId[],
      ipType: "licensed",
      franchiseName: "Nightmare Carnival (fictional franchise)",
      shortSummary: `${SAMPLE_NOTICE} A fictional licensed sequel house.`,
      isSample: true,
    },
    pumpkinPier: {
      eventYearId: yearIds.y2101,
      attractionType: "scare_zone",
      name: "Pumpkin Pier",
      slug: "pumpkin-pier",
      parkIds: ["orlando"] satisfies ParkId[],
      ipType: "original",
      shortSummary: `${SAMPLE_NOTICE} A fictional boardwalk overrun by jack-o'-lanterns.`,
      experienceDescription: "Sample experience notes: outdoor walkthrough, carnival soundscape.",
      isSample: true,
    },
    midnightCarnival: {
      eventYearId: yearIds.y2102,
      attractionType: "scare_zone",
      name: "Midnight Carnival",
      slug: "midnight-carnival",
      parkIds: ["hollywood", "orlando"] satisfies ParkId[],
      ipType: "original",
      shortSummary: `${SAMPLE_NOTICE} A fictional traveling carnival that never quite leaves.`,
      isSample: true,
    },
    graveyardRadio: {
      eventYearId: yearIds.y2103,
      attractionType: "scare_zone",
      name: "Graveyard Radio",
      slug: "graveyard-radio",
      parkIds: ["hollywood"] satisfies ParkId[],
      ipType: "licensed",
      franchiseName: "The Graveyard Broadcast (fictional franchise)",
      shortSummary: `${SAMPLE_NOTICE} A fictional tie-in to a made-up late-night radio show.`,
      isSample: true,
    },
  };

  const attractionIds = {} as Record<AttractionKey, EntityId>;
  for (const [key, input] of Object.entries(attractionInputs) as Array<
    [AttractionKey, AttractionInput]
  >) {
    attractionIds[key] = (await attractions.create(input)).id;
  }

  // ---------------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------------
  await characters.create({
    attractionId: attractionIds.moonlightManor,
    name: "The Hollow Duchess",
    description: SAMPLE_NOTICE,
  });
  await characters.create({
    attractionId: attractionIds.moonlightManor,
    name: "Groundskeeper Wick",
    description: SAMPLE_NOTICE,
  });
  await characters.create({
    attractionId: attractionIds.witheringAsylum,
    name: "Nurse Static",
    description: SAMPLE_NOTICE,
  });
  await characters.create({
    attractionId: attractionIds.pumpkinPier,
    name: "The Ferry Captain",
    description: SAMPLE_NOTICE,
  });
  await characters.create({
    attractionId: attractionIds.pumpkinPier,
    name: "Tide-Touched Twins",
    description: SAMPLE_NOTICE,
  });
  const characterCount = 5;

  // ---------------------------------------------------------------------
  // Sources — includes a YouTube source, per the requirement that YouTube
  // be a supported source type.
  // ---------------------------------------------------------------------
  const moonlightManorVideo = await sources.create({
    sourceType: "youtube",
    title: "Sample Walkthrough — Moonlight Manor (Fan Channel)",
    url: "https://example.invalid/sample-sources/moonlight-manor-walkthrough",
    publisher: "Fictional Fan Channel",
    notes: SAMPLE_NOTICE,
    isSample: true,
  });
  const moonlightManorArticle = await sources.create({
    sourceType: "article",
    title: "Sample Preview Article: Moonlight Manor",
    url: "https://example.invalid/sample-sources/moonlight-manor-preview",
    publisher: "Fictional Haunt Blog",
    notes: SAMPLE_NOTICE,
    isSample: true,
  });
  const witheringAsylumOfficial = await sources.create({
    sourceType: "official_site",
    title: "Shadowfest Official Preview Page (Sample)",
    url: "https://example.invalid/sample-sources/withering-asylum-official",
    notes: SAMPLE_NOTICE,
    isSample: true,
  });
  const graveyardRadioVideo = await sources.create({
    sourceType: "youtube",
    title: "Sample Walkthrough — Graveyard Radio",
    url: "https://example.invalid/sample-sources/graveyard-radio-walkthrough",
    publisher: "Fictional Fan Channel",
    notes: SAMPLE_NOTICE,
    isSample: true,
  });
  const graveyardRadioPodcast = await sources.create({
    sourceType: "podcast",
    title: "Behind Graveyard Radio (Sample Podcast Episode)",
    publisher: "Fictional Haunt Podcast",
    notes: SAMPLE_NOTICE,
    isSample: true,
  });

  await sources.attachToAttraction(attractionIds.moonlightManor, moonlightManorVideo.id);
  await sources.attachToAttraction(attractionIds.moonlightManor, moonlightManorArticle.id);
  await sources.attachToAttraction(attractionIds.witheringAsylum, witheringAsylumOfficial.id);
  await sources.attachToAttraction(attractionIds.graveyardRadio, graveyardRadioVideo.id);
  await sources.attachToAttraction(attractionIds.graveyardRadio, graveyardRadioPodcast.id);
  const sourceCount = 5;

  // ---------------------------------------------------------------------
  // Media — deliberately a mix of "has artwork" and "no artwork yet".
  // URLs point at example.invalid (RFC 2606) — metadata only, never a
  // real bundled asset. See the module doc comment above.
  // ---------------------------------------------------------------------
  await media.create({
    owner: { eventYearId: yearIds.y2101 },
    mediaType: "event_artwork",
    url: "https://example.invalid/sample-media/shadowfest-2101-keyart.jpg",
    attribution: "Placeholder key art created for development use only.",
    licenseNotes: "Sample-only asset — fictional, not a real licensed image.",
  });
  await media.create({
    owner: { attractionId: attractionIds.moonlightManor },
    mediaType: "poster",
    url: "https://example.invalid/sample-media/moonlight-manor-poster.jpg",
    attribution: "Placeholder poster created for development use only.",
    licenseNotes: "Sample-only asset — fictional, not a real licensed image.",
  });
  await media.create({
    owner: { attractionId: attractionIds.radioactiveCrypt },
    mediaType: "promotional_image",
    url: "https://example.invalid/sample-media/radioactive-crypt-promo.jpg",
    attribution: "Placeholder promotional image created for development use only.",
    licenseNotes: "Sample-only asset — fictional, not a real licensed image.",
  });
  await media.create({
    owner: { attractionId: attractionIds.graveyardRadio },
    mediaType: "logo",
    url: "https://example.invalid/sample-media/graveyard-radio-logo.jpg",
    attribution: "Placeholder logo created for development use only.",
    licenseNotes: "Sample-only asset — fictional, not a real licensed image.",
  });
  // witheringAsylum, nightmareCarnivalSecondAct, midnightCarnival, pumpkinPier,
  // and Shadowfest 2102/2103 deliberately have NO media rows — "no artwork yet".
  const mediaCount = 4;

  // ---------------------------------------------------------------------
  // Related attractions — one example of each relation type.
  // ---------------------------------------------------------------------
  await relations.create({
    attractionId: attractionIds.nightmareCarnivalSecondAct,
    relatedAttractionId: attractionIds.midnightCarnival,
    relationType: "sequel",
    notes: `${SAMPLE_NOTICE} Second Act continues the (fictional) story hinted at in Midnight Carnival.`,
  });
  await relations.create({
    attractionId: attractionIds.graveyardRadio,
    relatedAttractionId: attractionIds.midnightCarnival,
    relationType: "previous_version",
    notes: `${SAMPLE_NOTICE} Graveyard Radio's footprint replaced Midnight Carnival's the following year.`,
  });
  await relations.create({
    attractionId: attractionIds.radioactiveCrypt,
    relatedAttractionId: attractionIds.moonlightManor,
    relationType: "related_concept",
    notes: `${SAMPLE_NOTICE} Fan theory connects both fictional attractions to the same fictional town.`,
  });
  await relations.create({
    attractionId: attractionIds.radioactiveCrypt,
    relatedAttractionId: attractionIds.graveyardRadio,
    relationType: "same_franchise",
    notes: `${SAMPLE_NOTICE} Both are tie-ins under the fictional "Sample Studios" shared universe.`,
  });
  const relationCount = 4;

  // ---------------------------------------------------------------------
  // Ratings — a mix of rated and genuinely unrated attractions.
  // ---------------------------------------------------------------------
  await ratings.upsert(attractionIds.moonlightManor, { theme: 4.5, fun: 4, fear: 3.5 });
  await ratings.upsert(attractionIds.witheringAsylum, { theme: 3.5, fun: 3, fear: 4.5 });
  await ratings.upsert(attractionIds.pumpkinPier, { theme: 3, fun: 4.5, fear: 2.5 });
  await ratings.upsert(attractionIds.graveyardRadio, { theme: 5, fun: 4, fear: 4.5 });
  // radioactiveCrypt, nightmareCarnivalSecondAct and midnightCarnival are
  // deliberately left unrated — never treat that as a rating of 0.
  const ratingCount = 4;

  // ---------------------------------------------------------------------
  // A personal note, and manual rankings that deliberately override what
  // the calculated score would produce (to demonstrate manual ranking
  // always taking precedence).
  // ---------------------------------------------------------------------
  await notes.upsert(
    attractionIds.moonlightManor,
    "Sample note: revisit the fog timing near the finale.",
  );
  const noteCount = 1;

  // By total: Moonlight Manor (12) > Withering Asylum (11); the other two
  // houses are unrated. This manual order deliberately puts the
  // lower-scored house first, and an unrated house above a rated one.
  await rankings.setScope(allTimeScope("house"), [
    attractionIds.witheringAsylum,
    attractionIds.moonlightManor,
    attractionIds.nightmareCarnivalSecondAct,
    attractionIds.radioactiveCrypt,
  ]);
  await rankings.setScope(allTimeScope("scare_zone"), [
    attractionIds.midnightCarnival,
    attractionIds.graveyardRadio,
    attractionIds.pumpkinPier,
  ]);
  const rankingScopeCount = 2;

  return {
    eventYears: Object.keys(yearIds).length,
    attractions: Object.keys(attractionIds).length,
    characters: characterCount,
    sources: sourceCount,
    media: mediaCount,
    relations: relationCount,
    ratings: ratingCount,
    notes: noteCount,
    rankingScopes: rankingScopeCount,
  };
}
