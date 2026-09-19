# HHN attraction catalogue

**Status: for human review. Nothing here has been entered into the app, and no
application code was changed.**

Every house, scare zone and Terror Tram in scope: **2010 onwards**, for the
years [the eligibility research](hhn-year-eligibility.md) approved — Orlando and
Hollywood, 2010–2019 and 2021–2026.

No wiki articles have been written. This is names, years, types, parks, IP and
provenance, which is what the next phase needs before any prose exists.

- Rows collected: **418** (221 Orlando, 197 Hollywood) across 32 park-years
- Archive records after cross-park merging: **416**
- Types: **262 houses** and **156 scare zones**, the latter including 15 Terror Trams
- IP: **193 original**, **203 licensed**, 22 unclassified
- Machine-readable: [hhn-attraction-catalogue.json](hhn-attraction-catalogue.json)

## Scope: 2010 and later

The archive starts at **2010**. That is a deliberate cap, not a judgement about
what footage exists: the eligibility research found usable material back to
Orlando 1991, and those years can be added later by moving one constant in the
extraction script.

What the cap buys is consistency. From 2010 both parks run every year (bar the
2020 cancellation), full-event walkthroughs exist for nearly every season, and
Universal's own press material covers the line-ups — so every record in the
archive can be sourced to the same standard. Below 2010 that stops being true
year by year.

## How this was collected

Each approved year's event page on the Halloween Horror Nights Wiki was read
through the wiki's own API, section by section — "Haunted Houses", "Scarezones",
"Terror Tram", "Street Experiences" — and then **each attraction's own page was
read** for the fields the year pages don't carry: what it was based on, the
venue it was housed in, and the park and year the page itself claims.

**Original vs licensed comes from each page's "Based on" field**, not from
reading the name. 203 rows name a franchise there; 193 say "Original";
22 say nothing usable and are marked **unclassified** rather than guessed.

**The extraction was audited against each page's own stated counts** ("Number of
Haunted Houses | 10"). 31 of 32 in-scope park-years match exactly; the 1 that
don't are listed under "Data quality".

This is a fan wiki, so it is a **starting catalogue, not a citation of record**.
Every row links to the page it came from, and names, years and IP should be
confirmed against Universal's own material as each attraction is written up.

## The Terror Tram

Recorded as **scare zones** — 15 of them in scope. It is an open-air walk
through a themed backlot area with roaming scareactors, which is what a scare
zone is; filing it under houses would put a tram-and-walk experience into
rankings beside enclosed maze builds and make both harder to read. Each one
keeps its year's subtitle, so it stays identifiable.

## Cross-park records

An archive attraction belongs to exactly one event year, and one event record
covers both parks — so **merging is only ever a question within a single
calendar year**. The same title at Orlando in 2016 and Hollywood in 2018 is two
records whatever else is true.

**52 titles ran at both parks in the same year.** The rule applied:
**merge where a source says the two builds were essentially the same; otherwise
treat them as separate versions.** The canonical split is Universal Monsters:
Legends Collide, where one name covered two different match-ups.

### Merged — one record, both parks (2)

**2023 — The Exorcist: Believer**

- Orlando: [The Exorcist: Believer](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist%3A_Believer_(Orlando)>) — Soundstage 22
- Hollywood: [The Exorcist: Believer](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist%3A_Believer_(Hollywood)>) — Soundstage 22

  > Hollywood has the same layout and (almost the same) scare-actors as Orlando except for the ending.

**2025 — Five Nights at Freddy's**

- Orlando: [Five Nights at Freddy's](<https://halloweenhorrornights.fandom.com/wiki/Five_Nights_at_Freddy's_(Orlando)>) — Soundstage 23B
- Hollywood: [Five Nights at Freddy's](<https://halloweenhorrornights.fandom.com/wiki/Five_Nights_at_Freddy's_(Hollywood)>) — Soundstage 15

  > According to John Murdy, the house is really close coast to coast with its Orlando counterpart.

Both are recorded as a single attraction with `parks: ["hollywood", "orlando"]`.
The evidence is a claim of near-identity, not proof of it — the Five Nights at
Freddy's pages also note that Hollywood showed only Freddy as an animatronic
where Orlando showed Bonnie and Chica too. If that kind of difference should
force a split, these two are the ones to revisit.

### Separated on explicit evidence (8)

Sources describe these as different builds:

**2014 — AVP: Alien vs. Predator**

- Orlando: [AVP: Alien vs. Predator](<https://halloweenhorrornights.fandom.com/wiki/AVP%3A_Alien_vs._Predator_(Orlando)>) — Soundstage 24
- Hollywood: [AVP: Alien vs. Predator](<https://halloweenhorrornights.fandom.com/wiki/AVP%3A_Alien_vs._Predator_(Hollywood)>) — Soundstage 747

  > So the team came up with an all new story that is exclusive to Halloween Horror Nights.

**2019 — House of 1000 Corpses**

- Orlando: [House of 1000 Corpses](<https://halloweenhorrornights.fandom.com/wiki/House_of_1000_Corpses_(Haunted_House_Orlando)>) — MIB Tent
- Hollywood: [House of 1000 Corpses](<https://halloweenhorrornights.fandom.com/wiki/House_of_1000_Corpses_(Haunted_Maze_Hollywood)>) — Waterworld Queue

  > *The final scare was a new twist they came up with to end the maze that was different from the previous HOTC mazes.

**2021 — The Texas Chainsaw Massacre**

- Orlando: [The Texas Chainsaw Massacre](<https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre_(Orlando_2021)>) — Soundstage 23B
- Hollywood: [The Texas Chainsaw Massacre](<https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre_(Hollywood)>) — Mummy Venue

  > *They wanted to make it different from the 26 Version but keep the spirit of the original film.

**2022 — The Horrors of Blumhouse**

- Orlando: [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Orlando_2022)>) — Fast & Furious Location
- Hollywood: [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Hollywood_2022)>) — Waterworld Queue

  > *This house was different from previous Blumhouse haunted houses as it was two retellings of films with twists along the way https://twitter.com/Hallowed_Horror/status/1540014266434338816?t=l5eaPe7kkTGPM6lrbiS3PQ&s=19 .

**2022 — Universal Monsters: Legends Collide**

- Orlando: [Universal Monsters: Legends Collide](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Legends_Collide_(Orlando)>) — Parade Warehouse
- Hollywood: [Universal Monsters: Legends Collide](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Legends_Collide_(Hollywood)>) — Mummy Venue

  > - Hollywood's version of this house was conceived to be Mummy vs Dracula while Orlando's was Wolfman vs Mummy.

  > *Orlando's version of this house was conceived to be Mummy vs Wolfman while Hollywood's was Dracula vs Mummy.

**2022 — The Weeknd: After Hours Nightmare**

- Orlando: [The Weeknd: After Hours Nightmare](<https://halloweenhorrornights.fandom.com/wiki/The_Weeknd%3A_After_Hours_Nightmare_(Orlando)>) — Second Parade Warehouse
- Hollywood: [The Weeknd: After Hours Nightmare](<https://halloweenhorrornights.fandom.com/wiki/The_Weeknd%3A_After_Hours_Nightmare_(Hollywood)>) — Soundstage 29

  > *The house is a third larger than the average Halloween Horror Nights Hollywood house, and was close to being the largest house they've ever done https://www.forbes.com/sites/simonthompson/2022/09/02/heres-what-you-need-to-know-about-the-weeknds-after-hours-nightmare-at-halloween-horror-nights/amp/ .

**2025 — WWE Presents: The Horrors of The Wyatt Sicks**

- Orlando: [WWE Presents: The Horrors of The Wyatt Sicks](<https://halloweenhorrornights.fandom.com/wiki/WWE_Presents%3A_The_Horrors_of_The_Wyatt_Sicks_(Orlando)>) — Soundstage 23A
- Hollywood: [WWE Presents: The Horrors of The Wyatt Sicks](<https://halloweenhorrornights.fandom.com/wiki/WWE_Presents%3A_The_Horrors_of_The_Wyatt_Sicks_(Hollywood)>) — Jurassic World Queue

  > - According to John Murdy, this house is their own take of the Wyatt Sicks but shares some things in common with their Orlando counterpart.

  > - According to John Murdy, he described this house as their own take on the Wyatt Sicks Horrorverse, creating domains for each of the characters with lots of Easter Eggs for the fans.

**2025 — Terrifier**

- Orlando: [Terrifier](<https://halloweenhorrornights.fandom.com/wiki/Terrifier_(Orlando)>) — Soundstage 25
- Hollywood: [Terrifier](<https://halloweenhorrornights.fandom.com/wiki/Terrifier_(Hollywood)>) — H-Lot North

  > - Unlike Hollywood, the clown on the facade for this house was painted over to look more like Art the Clown in order to sell the idea that he completely took over the Terrifier Funhouse,

### Separated by default — no source comment found (42)

Same title, same year, different venues, separate wiki pages, but nothing found
either way about whether the builds matched. Under the rule these are separate
versions. **These are the ambiguous cases**: if any of them were in fact the
same build, they are the rows to correct.

| Year | Attraction                                          | Orlando venue           | Hollywood venue     |
| ---- | --------------------------------------------------- | ----------------------- | ------------------- |
| 2012 | The Walking Dead: Dead Inside                       | Disaster!               | Wild West Stage     |
| 2012 | Welcome to Silent Hill                              | Soundstage 22           | Mummy Venue         |
| 2013 | The Walking Dead: No Safe Haven                     | Parade Warehouse        | Metro Sets Tent     |
| 2014 | Dracula Untold: Reign of Blood                      | Soundstage 24           | Parisian Courtyard  |
| 2014 | The Walking Dead: End of the Line                   | Soundstage 25           | Metro Sets Tent     |
| 2014 | From Dusk Till Dawn                                 | Soundstage 22           | FDTD Area           |
| 2014 | Face Off: In the Flesh                              | Hollywood               | UBE Venue           |
| 2014 | The Purge: Anarchy                                  | New York                | Front Gates         |
| 2016 | Krampus                                             | Shrek Theater           | Metro Sets Tent     |
| 2016 | American Horror Story                               | Soundstage 19           | FDTD Area           |
| 2016 | The Exorcist                                        | Soundstage 22           | Mummy Venue         |
| 2016 | Halloween: Hell Comes to Haddonfield                | Parade Warehouse        | Jurassic Park Queue |
| 2017 | The Shining                                         | Soundstage 22           | Mummy Venue         |
| 2017 | Ash Vs. Evil Dead                                   | Parade Warehouse        |                     |
| 2017 | SAW: The Games of Jigsaw                            | Shrek Theater           | 747 Tent            |
| 2017 | The Horrors of Blumhouse                            | MIB Tent                | Parisian Courtyard  |
| 2018 | Stranger Things                                     | Soundstage 22           | Soundstage 29       |
| 2018 | Trick 'r Treat                                      | Parade Warehouse        | Mummy Venue         |
| 2018 | Poltergeist                                         | Soundstage 25           | 747 Tent            |
| 2018 | Halloween 4: The Return of Michael Myers            | Shrek Theater           | Waterworld Queue    |
| 2019 | Stranger Things                                     | Soundstage 25           | Soundstage 29       |
| 2019 | Ghostbusters                                        | Soundstage 22           | 747 Tent            |
| 2019 | Killer Klowns From Outer Space                      | Shrek Theater           | Mummy Venue         |
| 2019 | Us                                                  | Soundstage 24           | Tram Garage Tent 1  |
| 2021 | Universal Monsters: The Bride of Frankenstein Lives | Soundstage 23A          | Parisian Courtyard  |
| 2022 | Halloween                                           | Soundstage 23B          | H-Lot South         |
| 2023 | Stranger Things 4                                   | Soundstage 23B          | Soundstage 15       |
| 2023 | Chucky: Ultimate Kill Count                         | Fast & Furious Location | H-Lot North         |
| 2023 | Universal Monsters: Unmasked                        | Parade Warehouse        | H-Lot South         |
| 2023 | The Last of Us                                      | Second Parade Warehouse | Mummy Venue         |
| 2024 | A Quiet Place                                       | Soundstage 22           | UBE Venue           |
| 2024 | Ghostbusters: Frozen Empire                         | Soundstage 23B          | H-Lot North         |
| 2024 | Insidious: The Further                              | Soundstage 24A          | H-Lot South         |
| 2024 | Universal Monsters: Eternal Bloodlines              | Sprung Tent 3           | Soundstage 12       |
| 2025 | Jason Universe                                      | Fast & Furious Location | Mummy Venue         |
| 2025 | Fallout                                             | Sprung Tent 4           | UBE Venue           |
| 2026 | Evil Dead Burn                                      | Soundstage 23A          | H-Lot South         |
| 2026 | Stranger Things 5                                   | Soundstage 23B          | Soundstage 15       |
| 2026 | Ozzy Osbourne: Prince of Darkness                   | Soundstage 24A          | Mummy Venue         |
| 2026 | Sinners                                             | Sprung Tent 3           | UBE Venue           |
| 2026 | Hellraiser                                          | Sprung Tent 4           | H-Lot North         |
| 2026 | Fortnitemares                                       | Central Park            | New York Street     |

Separated pairs carry a `variantName` of "Orlando version" or "Hollywood
version" and should be linked with a `related_concept` relation at entry.

### Same title, different years (relation candidates)

15 titles appear at both parks in different years, and 14 repeat at one
park across years. Separate records either way — different event years — and
candidates for `previous_version` or `same_franchise` relations.

| Title                                    | Appearances                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Alice Cooper: Welcome to My Nightmare    | Orlando 2012, Hollywood 2011                                               |
| An American Werewolf in London           | Orlando 2013, Orlando 2015, Hollywood 2014                                 |
| AVP: Alien vs. Predator                  | Orlando 2014, Hollywood 2014, Hollywood 2015                               |
| Halloween                                | Orlando 2014, Orlando 2022, Hollywood 2022                                 |
| Freddy vs. Jason                         | Orlando 2015, Hollywood 2016                                               |
| The Exorcist                             | Orlando 2016, Hollywood 2016, Hollywood 2021                               |
| The Texas Chainsaw Massacre              | Orlando 2016, Orlando 2021, Hollywood 2021                                 |
| The Horrors of Blumhouse                 | Orlando 2017, Orlando 2018, Orlando 2022, Hollywood 2017, Hollywood 2022   |
| Scarecrow: The Reaping                   | Orlando 2017, Hollywood 2022                                               |
| Trick 'r Treat                           | Orlando 2017, Orlando 2018, Hollywood 2018, Hollywood 2018                 |
| Stranger Things                          | Orlando 2018, Orlando 2019, Hollywood 2018, Hollywood 2019                 |
| Poltergeist                              | Orlando 2018, Hollywood 2018, Hollywood 2025                               |
| Halloween 4: The Return of Michael Myers | Orlando 2018, Hollywood 2018, Hollywood 2021                               |
| Killer Klowns From Outer Space           | Orlando 2018, Orlando 2019, Hollywood 2019, Hollywood 2022, Hollywood 2026 |
| Monstruos: The Monsters of Latin America | Orlando 2024, Hollywood 2023                                               |

## Data quality

**Count mismatches (1).** Where the extracted list disagrees with the page's
own infobox count:

- **Hollywood 2026** — extracted 8 houses / 6 zones; the page states 8 / 4. The list on the page is what was taken.

**Unclassified IP (22).** No usable "Based on" field; the IP needs deciding
from another source:

- Orlando 2011 — [The Thing](<https://halloweenhorrornights.fandom.com/wiki/The_Thing_(2011)>)
- Orlando 2011 — [Saws N' Steam: Into the Machine](https://halloweenhorrornights.fandom.com/wiki/Saws_N'_Steam%3A_Into_the_Machine)
- Orlando 2012 — [Dead End](<https://halloweenhorrornights.fandom.com/wiki/Dead_End_(Orlando)>)
- Orlando 2012 — [Gothic](https://halloweenhorrornights.fandom.com/wiki/Gothic)
- Orlando 2012 — [Universal's House of Horrors](<https://halloweenhorrornights.fandom.com/wiki/Universal's_House_of_Horrors_(Orlando_2012)>)
- Orlando 2012 — [The Walking Dead: Dead Inside](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_Dead_Inside_(Orlando)>)
- Orlando 2012 — [Welcome to Silent Hill](<https://halloweenhorrornights.fandom.com/wiki/Welcome_to_Silent_Hill_(Orlando)>)
- Orlando 2012 — [Alice Cooper: Welcome to My Nightmare](<https://halloweenhorrornights.fandom.com/wiki/Alice_Cooper%3A_Welcome_to_My_Nightmare_(Orlando)>)
- Orlando 2012 — [Penn & Teller: New(kd) Vegas](<https://halloweenhorrornights.fandom.com/wiki/Penn_%26_Teller%3A_New(kd)_Vegas>)
- Orlando 2012 — [The Legions of Horror](https://halloweenhorrornights.fandom.com/wiki/The_Legions_of_Horror)
- Orlando 2014 — [Face Off: In the Flesh](<https://halloweenhorrornights.fandom.com/wiki/Face_Off%3A_In_the_Flesh_(Orlando)>)
- Orlando 2014 — [MASKerade: Unstitched](https://halloweenhorrornights.fandom.com/wiki/MASKerade%3A_Unstitched)
- Orlando 2015 — [​](https://halloweenhorrornights.fandom.com/wiki/Insidious)
- Orlando 2017 — [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Orlando_2017)>)
- Orlando 2017 — [Altars of Horror](https://halloweenhorrornights.fandom.com/wiki/Altars_of_Horror)
- Orlando 2018 — [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Orlando_2018)>)
- Orlando 2018 — [Scary Tales: Deadly Ever After](https://halloweenhorrornights.fandom.com/wiki/Scary_Tales%3A_Deadly_Ever_After)
- Hollywood 2016 — [American Horror Story](<https://halloweenhorrornights.fandom.com/wiki/American_Horror_Story_(Hollywood)>)
- Hollywood 2019 — [Creepshow](<https://halloweenhorrornights.fandom.com/wiki/Creepshow_(Haunted_House)>)
- Hollywood 2019 — [Us](<https://halloweenhorrornights.fandom.com/wiki/Us_(Hollywood)>)
- Hollywood 2024 — [Terror Tram: Enter the Blumhouse](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Enter_the_Blumhouse)
- Hollywood 2025 — [Terror Tram: Enter the Blumhouse](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Enter_the_Blumhouse)

**Shows are excluded.** Bill & Ted's Excellent Halloween Adventure and the like
are neither houses nor scare zones and the schema has no type for them. Still an
open question.

## The catalogue

A merged cross-park record appears once, under both parks, with each park's
venue. Everything else appears under its own park. "—" means the page didn't
say.

### Universal Orlando

#### 2010 — [Halloween Horror Nights: Twenty Years of Fear](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights%3A_Twenty_Years_of_Fear)

| Attraction                                                                                                                   | Type       | IP                                              | Parks   | Venue                   |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------- | ------- | ----------------------- |
| [Horror Nights: The Hallow'd Past](https://halloweenhorrornights.fandom.com/wiki/Horror_Nights%3A_The_Hallow'd_Past)         | House      | Original                                        | Orlando | Halloween Horror Nights |
| [The Orfanage: Ashes to Ashes](https://halloweenhorrornights.fandom.com/wiki/The_Orfanage%3A_Ashes_to_Ashes)                 | House      | Original                                        | Orlando | JAWS Queue              |
| [Hades: The Gates of Ruin](https://halloweenhorrornights.fandom.com/wiki/Hades%3A_The_Gates_of_Ruin)                         | House      | Licensed — Greek Mythology/ Clash of the Titans | Orlando | Soundstage 23           |
| [PsychoScareapy: Echoes of Shadybrook](https://halloweenhorrornights.fandom.com/wiki/PsychoScareapy%3A_Echoes_of_Shadybrook) | House      | Original                                        | Orlando | Soundstage 23           |
| [Havoc: Dogs of War](https://halloweenhorrornights.fandom.com/wiki/Havoc%3A_Dogs_of_War)                                     | House      | Original                                        | Orlando | Sprung Tent 2           |
| [Catacombs: Black Death Rising](https://halloweenhorrornights.fandom.com/wiki/Catacombs%3A_Black_Death_Rising)               | House      | Original                                        | Orlando | Sprung Tent 1           |
| [ZombieGeddon](https://halloweenhorrornights.fandom.com/wiki/ZombieGeddon)                                                   | House      | Original                                        | Orlando | Disaster! Queue         |
| [Legendary Truth: The Wyandot Estate](https://halloweenhorrornights.fandom.com/wiki/Legendary_Truth%3A_The_Wyandot_Estate)   | House      | Licensed — Legendary Truth: Awakening           | Orlando | Soundstage 22           |
| [HHN: 20 Years of Fear](https://halloweenhorrornights.fandom.com/wiki/HHN%3A_20_Years_of_Fear)                               | Scare zone | Original                                        | Orlando | Hollywood               |
| [Fear Revealed](https://halloweenhorrornights.fandom.com/wiki/Fear_Revealed)                                                 | Scare zone | Original                                        | Orlando | Mel's Drive-In          |
| [Zombie Gras](https://halloweenhorrornights.fandom.com/wiki/Zombie_Gras)                                                     | Scare zone | Original                                        | Orlando | San Francisco           |
| [Esqueleto Muerte](https://halloweenhorrornights.fandom.com/wiki/Esqueleto_Muerte)                                           | Scare zone | Original                                        | Orlando | Plaza of the Stars      |
| [Saws N' Steam](https://halloweenhorrornights.fandom.com/wiki/Saws_N'_Steam)                                                 | Scare zone | Original                                        | Orlando | New York                |
| [The Coven](https://halloweenhorrornights.fandom.com/wiki/The_Coven)                                                         | Scare zone | Original                                        | Orlando | Shrek Alley             |

#### 2011 — [Halloween Horror Nights 21](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_21)

| Attraction                                                                                                                                             | Type       | IP                             | Parks   | Venue                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------ | ------- | ------------------------- |
| [Nevermore: The Madness of Poe](https://halloweenhorrornights.fandom.com/wiki/Nevermore%3A_The_Madness_of_Poe)                                         | House      | Licensed — The Tell Tale Heart | Orlando | Sprung Tent 2             |
| [The Forsaken](https://halloweenhorrornights.fandom.com/wiki/The_Forsaken)                                                                             | House      | Original                       | Orlando | Parade Warehouse          |
| [The Thing](<https://halloweenhorrornights.fandom.com/wiki/The_Thing_(2011)>)                                                                          | House      | **unclassified**               | Orlando | Soundstage 23             |
| [Saws N' Steam: Into the Machine](https://halloweenhorrornights.fandom.com/wiki/Saws_N'_Steam%3A_Into_the_Machine)                                     | House      | **unclassified**               | Orlando | JAWS Queue                |
| [H.R. Bloodengutz Presents: Holidays of Horror](https://halloweenhorrornights.fandom.com/wiki/H.R._Bloodengutz_Presents%3A_Holidays_of_Horror)         | House      | Original                       | Orlando | Disaster! Queue           |
| [The In-Between](https://halloweenhorrornights.fandom.com/wiki/The_In-Between)                                                                         | House      | Original                       | Orlando | Sprung Tent 1             |
| [Winter's Night: The Haunting of Hawthorn Cemetery](https://halloweenhorrornights.fandom.com/wiki/Winter's_Night%3A_The_Haunting_of_Hawthorn_Cemetery) | House      | Original                       | Orlando | Soundstage 22             |
| [Nightingales: Blood Prey](https://halloweenhorrornights.fandom.com/wiki/Nightingales%3A_Blood_Prey)                                                   | House      | Original                       | Orlando | Soundstage 23             |
| [Acid Assault](https://halloweenhorrornights.fandom.com/wiki/Acid_Assault)                                                                             | Scare zone | Original                       | Orlando | New York                  |
| [Canyon of Dark Souls](https://halloweenhorrornights.fandom.com/wiki/Canyon_of_Dark_Souls)                                                             | Scare zone | Original                       | Orlando | International Food Bazaar |
| [Grown Evil](https://halloweenhorrornights.fandom.com/wiki/Grown_Evil)                                                                                 | Scare zone | Original                       | Orlando | Central Park              |
| [7](https://halloweenhorrornights.fandom.com/wiki/7)                                                                                                   | Scare zone | Original                       | Orlando | Hollywood                 |
| [NightMaze](https://halloweenhorrornights.fandom.com/wiki/NightMaze)                                                                                   | Scare zone | Original                       | Orlando | Shrek Alley               |
| [Your Luck Has Run Out!](https://halloweenhorrornights.fandom.com/wiki/Your_Luck_Has_Run_Out)                                                          | Scare zone | Original                       | Orlando | Sting Alley               |

#### 2012 — [Halloween Horror Nights 22](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_22)

| Attraction                                                                                                                                     | Type       | IP               | Parks   | Venue            |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------- | ------- | ---------------- |
| [Dead End](<https://halloweenhorrornights.fandom.com/wiki/Dead_End_(Orlando)>)                                                                 | House      | **unclassified** | Orlando | Soundstage 20    |
| [Gothic](https://halloweenhorrornights.fandom.com/wiki/Gothic)                                                                                 | House      | **unclassified** | Orlando | Soundstage 20    |
| [Universal's House of Horrors](<https://halloweenhorrornights.fandom.com/wiki/Universal's_House_of_Horrors_(Orlando_2012)>)                    | House      | **unclassified** | Orlando | Parade Warehouse |
| [The Walking Dead: Dead Inside](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_Dead_Inside_(Orlando)>) _(Orlando version)_ | House      | **unclassified** | Orlando | Disaster!        |
| [Welcome to Silent Hill](<https://halloweenhorrornights.fandom.com/wiki/Welcome_to_Silent_Hill_(Orlando)>) _(Orlando version)_                 | House      | **unclassified** | Orlando | Soundstage 22    |
| [Alice Cooper: Welcome to My Nightmare](<https://halloweenhorrornights.fandom.com/wiki/Alice_Cooper%3A_Welcome_to_My_Nightmare_(Orlando)>)     | House      | **unclassified** | Orlando | Sprung Tent 1    |
| [Penn & Teller: New(kd) Vegas](<https://halloweenhorrornights.fandom.com/wiki/Penn_%26_Teller%3A_New(kd)_Vegas>)                               | House      | **unclassified** | Orlando | Sprung Tent 2    |
| [The Legions of Horror](https://halloweenhorrornights.fandom.com/wiki/The_Legions_of_Horror)                                                   | Scare zone | **unclassified** | Orlando | Park-wide        |

#### 2013 — [Halloween Horror Nights 23](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_23)

| Attraction                                                                                                                                         | Type       | IP                                                         | Parks   | Venue            |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------- | ------- | ---------------- |
| [Resident Evil: Escape from Raccoon City](https://halloweenhorrornights.fandom.com/wiki/Resident_Evil%3A_Escape_from_Raccoon_City)                 | House      | Licensed — Resident Evil/Biohazard (Franchise) (1996-2012) | Orlando | Soundstage 21    |
| [The Walking Dead: No Safe Haven](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_No_Safe_Haven_(Orlando)>) _(Orlando version)_ | House      | Licensed — The Walking Dead (Season 3)                     | Orlando | Parade Warehouse |
| [Evil Dead](https://halloweenhorrornights.fandom.com/wiki/Evil_Dead)                                                                               | House      | Licensed — Evil Dead (2013 remake)                         | Orlando | Soundstage 24    |
| [The Cabin in the Woods](https://halloweenhorrornights.fandom.com/wiki/The_Cabin_in_the_Woods)                                                     | House      | Licensed — The Cabin in the Woods (2011)                   | Orlando | Soundstage 21    |
| [An American Werewolf in London](<https://halloweenhorrornights.fandom.com/wiki/An_American_Werewolf_in_London_(Orlando)>)                         | House      | Licensed — An American Werewolf in London (1981)           | Orlando | Soundstage 22    |
| [Urban Legends: La Llorona](https://halloweenhorrornights.fandom.com/wiki/Urban_Legends%3A_La_Llorona)                                             | House      | Licensed — The Legend Of La Llorona                        | Orlando | Sprung Tent 1    |
| [Afterlife: Death's Vengeance](https://halloweenhorrornights.fandom.com/wiki/Afterlife%3A_Death's_Vengeance)                                       | House      | Original                                                   | Orlando | Sprung Tent 2    |
| [Havoc: Derailed](https://halloweenhorrornights.fandom.com/wiki/Havoc%3A_Derailed)                                                                 | House      | Original                                                   | Orlando | Disaster! Queue  |
| [The Walking Dead: The Undead Streets](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_The_Undead_Streets)                       | Scare zone | Licensed — The Walking Dead (Seasons 1, 2, and 3)          | Orlando | Park-wide        |

#### 2014 — [Halloween Horror Nights 24](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_24)

| Attraction                                                                                                                                                 | Type       | IP                                                   | Parks   | Venue              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- | ------- | ------------------ |
| [AVP: Alien vs. Predator](<https://halloweenhorrornights.fandom.com/wiki/AVP%3A_Alien_vs._Predator_(Orlando)>) _(Orlando version)_                         | House      | Licensed — Alien Franchise (1979-1997)               | Orlando | Soundstage 24      |
| [Dollhouse of the Damned](<https://halloweenhorrornights.fandom.com/wiki/Dollhouse_of_the_Damned_(Haunted_House)>)                                         | House      | Original                                             | Orlando | Sprung Tent 1      |
| [Dracula Untold: Reign of Blood](<https://halloweenhorrornights.fandom.com/wiki/Dracula_Untold%3A_Reign_of_Blood_(Orlando)>) _(Orlando version)_           | House      | Licensed — Dracula Untold (2014)                     | Orlando | Soundstage 24      |
| [Giggles & Gore Inc.](https://halloweenhorrornights.fandom.com/wiki/Giggles_%26_Gore_Inc.)                                                                 | House      | Original                                             | Orlando | Disaster! Queue    |
| [Halloween](<https://halloweenhorrornights.fandom.com/wiki/Halloween_(Orlando_2014)>)                                                                      | House      | Licensed — Halloween (1978)                          | Orlando | Sprung Tent 2      |
| [Roanoke: Cannibal Colony](https://halloweenhorrornights.fandom.com/wiki/Roanoke%3A_Cannibal_Colony)                                                       | House      | Original                                             | Orlando | Parade Warehouse   |
| [The Walking Dead: End of the Line](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_The_End_of_the_Line_(Orlando)>) _(Orlando version)_ | House      | Licensed — The Walking Dead (Season 4)               | Orlando | Soundstage 25      |
| [From Dusk Till Dawn](<https://halloweenhorrornights.fandom.com/wiki/From_Dusk_Till_Dawn_(Orlando)>) _(Orlando version)_                                   | House      | Licensed — From Dusk Till Dawn: The Series (2014)    | Orlando | Soundstage 22      |
| [Bayou of Blood](https://halloweenhorrornights.fandom.com/wiki/Bayou_of_Blood)                                                                             | Scare zone | Original                                             | Orlando | Central Park       |
| [Face Off: In the Flesh](<https://halloweenhorrornights.fandom.com/wiki/Face_Off%3A_In_the_Flesh_(Orlando)>) _(Orlando version)_                           | Scare zone | **unclassified**                                     | Orlando | Hollywood          |
| [MASKerade: Unstitched](https://halloweenhorrornights.fandom.com/wiki/MASKerade%3A_Unstitched)                                                             | Scare zone | **unclassified**                                     | Orlando | Plaza of the Stars |
| [The Purge: Anarchy](<https://halloweenhorrornights.fandom.com/wiki/The_Purge%3A_Anarchy_(Orlando)>) _(Orlando version)_                                   | Scare zone | Licensed — The Purge (2013)The Purge: Anarchy (2014) | Orlando | New York           |

#### 2015 — [Halloween Horror Nights 25](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_25)

| Attraction                                                                                                                                     | Type       | IP                                               | Parks   | Venue              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ | ------- | ------------------ |
| [Jack Presents: 25 Years of Monsters & Mayhem](https://halloweenhorrornights.fandom.com/wiki/Jack_Presents%3A_25_Years_of_Monsters_%26_Mayhem) | House      | Original                                         | Orlando | Soundstage 21      |
| [An American Werewolf in London](<https://halloweenhorrornights.fandom.com/wiki/An_American_Werewolf_in_London_(Orlando)>)                     | House      | Licensed — An American Werewolf in London (1981) | Orlando | Soundstage 22      |
| [Freddy vs. Jason](<https://halloweenhorrornights.fandom.com/wiki/Freddy_vs._Jason_(Orlando)>)                                                 | House      | Licensed — Friday the 13th Franchise (1980-2009) | Orlando | Soundstage 24      |
| [Body Collectors: Recollections](https://halloweenhorrornights.fandom.com/wiki/Body_Collectors%3A_Recollections)                               | House      | Original                                         | Orlando | Soundstage 24      |
| [​RUN: Blood Sweat and Fears](https://halloweenhorrornights.fandom.com/wiki/RUN%3A_Blood%2C_Sweat_and_Fears)                                   | House      | Original                                         | Orlando | Disaster! Queue    |
| [The Purge](<https://halloweenhorrornights.fandom.com/wiki/The_Purge_(2015)>)                                                                  | House      | Licensed — The Purge Franchise (2013-2014)       | Orlando | Sprung Tent 1      |
| [Asylum in Wonderland 3D](https://halloweenhorrornights.fandom.com/wiki/Asylum_in_Wonderland%C2%A03D)                                          | House      | Licensed — Alice in Wonderland                   | Orlando | Shrek Theater      |
| [The Walking Dead: The Living and the Dead](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_The_Living_and_the_Dead)         | House      | Licensed — The Walking Dead (Season 5)           | Orlando | Parade Warehouse   |
| [​](https://halloweenhorrornights.fandom.com/wiki/Insidious)                                                                                   | House      | **unclassified**                                 | Orlando | Insidious          |
| [PsychoScareapy: Unleashed](https://halloweenhorrornights.fandom.com/wiki/PsychoScareapy%3A_Unleashed)                                         | Scare zone | Original                                         | Orlando | New York           |
| [ICONS: HHN](https://halloweenhorrornights.fandom.com/wiki/ICONS%3A_HHN)                                                                       | Scare zone | Licensed — Orginal                               | Orlando | Hollywood          |
| [Scary Tales: ScreamPunk](https://halloweenhorrornights.fandom.com/wiki/Scary_Tales%3A_Screampunk)                                             | Scare zone | Original                                         | Orlando | Plaza of the Stars |
| [Evil’s Roots](https://halloweenhorrornights.fandom.com/wiki/Evil's_Roots)                                                                     | Scare zone | Original                                         | Orlando | Central Park       |
| [All Nite Die-In: Double Feature](https://halloweenhorrornights.fandom.com/wiki/All_Nite_Die-In%3A_Double_Feature)                             | Scare zone | Licensed — Various horror movies                 | Orlando | San Francisco      |

#### 2016 — [Halloween Horror Nights 26](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_26)

| Attraction                                                                                                                                                   | Type       | IP                                                   | Parks   | Venue              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------- | ------- | ------------------ |
| [Krampus](<https://halloweenhorrornights.fandom.com/wiki/Krampus_(Orlando)>) _(Orlando version)_                                                             | House      | Licensed — Krampus (2015)                            | Orlando | Shrek Theater      |
| [American Horror Story](<https://halloweenhorrornights.fandom.com/wiki/American_Horror_Story_(Orlando)>) _(Orlando version)_                                 | House      | Licensed — American Horror Story (Seasons 1,4 and 5) | Orlando | Soundstage 19      |
| [The Exorcist](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist_(Orlando)>) _(Orlando version)_                                                   | House      | Licensed — The Exorcist (1973)                       | Orlando | Soundstage 22      |
| [The Walking Dead](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead_(2016)>)                                                                  | House      | Licensed — The Walking Dead (Seasons 1-6)            | Orlando | Soundstage 24A     |
| [Ghost Town: The Curse of Lightning Gulch](https://halloweenhorrornights.fandom.com/wiki/Ghost_Town%3A_The_Curse_of_Lightning_Gulch)                         | House      | Original                                             | Orlando | Soundstage 24B     |
| [Halloween: Hell Comes to Haddonfield](<https://halloweenhorrornights.fandom.com/wiki/Halloween%3A_Hell_Comes_to_Haddonfield_(Orlando)>) _(Orlando version)_ | House      | Licensed — Halloween II (1981)                       | Orlando | Parade Warehouse   |
| [Lunatic's Playground 3D: You Won't Stand A Chance](https://halloweenhorrornights.fandom.com/wiki/Lunatic's_Playground_3D%3A_You_Won't_Stand_a_Chance)       | House      | Original                                             | Orlando | MIB Tent           |
| [Tomb of the Ancients](https://halloweenhorrornights.fandom.com/wiki/Tomb_of_the_Ancients)                                                                   | House      | Original                                             | Orlando | Sprung Tent 1      |
| [The Texas Chainsaw Massacre](<https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre_(Orlando_2016)>)                                    | House      | Licensed — The Texas Chain Saw Massacre (1974)       | Orlando | Sprung Tent 2      |
| [Survive or Die: Apocalypse](https://halloweenhorrornights.fandom.com/wiki/Survive_or_Die%3A_Apocalypse)                                                     | Scare zone | Original                                             | Orlando | New York           |
| [Vamp '55](https://halloweenhorrornights.fandom.com/wiki/Vamp_'55)                                                                                           | Scare zone | Original                                             | Orlando | Hollywood          |
| [Lair of the Banshee](https://halloweenhorrornights.fandom.com/wiki/Lair_of_the_Banshee)                                                                     | Scare zone | Original                                             | Orlando | Central Park       |
| [Dead Man's Wharf](https://halloweenhorrornights.fandom.com/wiki/Dead_Man's_Wharf)                                                                           | Scare zone | Original                                             | Orlando | San Francisco      |
| [A Chance in Hell](https://halloweenhorrornights.fandom.com/wiki/A_Chance_in_Hell)                                                                           | Scare zone | Original                                             | Orlando | Plaza of the Stars |

#### 2017 — [Halloween Horror Nights 27](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_27)

| Attraction                                                                                                                              | Type       | IP                                                    | Parks   | Venue              |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------- | ------- | ------------------ |
| [American Horror Story: Volume 2](https://halloweenhorrornights.fandom.com/wiki/American_Horror_Story%3A_Volume_2)                      | House      | Licensed — American Horror Story: Asylum (2012)       | Orlando | Soundstage 21      |
| [The Shining](<https://halloweenhorrornights.fandom.com/wiki/The_Shining_(Orlando)>) _(Orlando version)_                                | House      | Licensed — The Shining (1980)                         | Orlando | Soundstage 22      |
| [Ash Vs. Evil Dead](<https://halloweenhorrornights.fandom.com/wiki/Ash_Vs._Evil_Dead_(Orlando)>) _(Orlando version)_                    | House      | Licensed — Ash vs Evil Dead Seasons 1 & 2 (2015-2016) | Orlando | Parade Warehouse   |
| [SAW: The Games of Jigsaw](<https://halloweenhorrornights.fandom.com/wiki/SAW%3A_The_Games_of_Jigsaw_(Orlando)>) _(Orlando version)_    | House      | Licensed — SAW franchise (2004-2017)                  | Orlando | Shrek Theater      |
| [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Orlando_2017)>) _(Orlando version)_ | House      | **unclassified**                                      | Orlando | MIB Tent           |
| [Dead Waters](https://halloweenhorrornights.fandom.com/wiki/Dead_Waters)                                                                | House      | Original                                              | Orlando | Soundstage 24      |
| [The Fallen](https://halloweenhorrornights.fandom.com/wiki/The_Fallen)                                                                  | House      | Original                                              | Orlando | Soundstage 24      |
| [Hive](https://halloweenhorrornights.fandom.com/wiki/Hive)                                                                              | House      | Original                                              | Orlando | Sprung Tent 2      |
| [Scarecrow: The Reaping](<https://halloweenhorrornights.fandom.com/wiki/Scarecrow%3A_The_Reaping_(Orlando)>)                            | House      | Original                                              | Orlando | Sprung Tent 1      |
| [Altars of Horror](https://halloweenhorrornights.fandom.com/wiki/Altars_of_Horror)                                                      | Scare zone | **unclassified**                                      | Orlando | Plaza of the Stars |
| [Festival of the Deadliest](https://halloweenhorrornights.fandom.com/wiki/Festival_of_the_Deadliest)                                    | Scare zone | Original                                              | Orlando | Hollywood          |
| [Invasion!](https://halloweenhorrornights.fandom.com/wiki/Invasion!)                                                                    | Scare zone | Original                                              | Orlando | San Francisco      |
| [The Purge](<https://halloweenhorrornights.fandom.com/wiki/The_Purge_(2017)>)                                                           | Scare zone | Licensed — The Purge                                  | Orlando | New York           |
| [Trick 'r Treat](<https://halloweenhorrornights.fandom.com/wiki/Trick_'r_Treat_(Scarezone_Orlando)>)                                    | Scare zone | Licensed — Trick 'r Treat (2007)                      | Orlando | Central Park       |

#### 2018 — [Halloween Horror Nights 28](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_28)

| Attraction                                                                                                                                                           | Type       | IP                                                         | Parks   | Venue                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------- | ------- | ----------------------- |
| [Stranger Things](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_(Orlando_2018)>) _(Orlando version)_                                                | House      | Licensed — Stranger Things Season 1 (2016)                 | Orlando | Soundstage 22           |
| [Trick 'r Treat](<https://halloweenhorrornights.fandom.com/wiki/Trick_'r_Treat_(Haunted_House_Orlando)>) _(Orlando version)_                                         | House      | Licensed — Trick 'r Treat (2007)                           | Orlando | Parade Warehouse        |
| [Dead Exposure: Patient Zero](https://halloweenhorrornights.fandom.com/wiki/Dead_Exposure%3A_Patient_Zero)                                                           | House      | Original                                                   | Orlando | Sprung Tent 1           |
| [Slaughter Sinema](https://halloweenhorrornights.fandom.com/wiki/Slaughter_Sinema)                                                                                   | House      | Original                                                   | Orlando | Sprung Tent 2           |
| [Carnival Graveyard: Rust in Pieces](https://halloweenhorrornights.fandom.com/wiki/Carnival_Graveyard%3A_Rust_in_Pieces)                                             | House      | Original                                                   | Orlando | Soundstage 24           |
| [Seeds of Extinction](https://halloweenhorrornights.fandom.com/wiki/Seeds_of_Extinction)                                                                             | House      | Original                                                   | Orlando | Second Parade Warehouse |
| [Poltergeist](<https://halloweenhorrornights.fandom.com/wiki/Poltergeist_(Orlando)>) _(Orlando version)_                                                             | House      | Licensed — Poltergeist (1982)                              | Orlando | Soundstage 25           |
| [Halloween 4: The Return of Michael Myers](<https://halloweenhorrornights.fandom.com/wiki/Halloween_4%3A_The_Return_of_Michael_Myers_(Orlando)>) _(Orlando version)_ | House      | Licensed — Halloween 4: The Return of Michael Myers (1988) | Orlando | Shrek Theater           |
| [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Orlando_2018)>)                                                  | House      | **unclassified**                                           | Orlando | MIB Tent                |
| [Scary Tales: Deadly Ever After](https://halloweenhorrornights.fandom.com/wiki/Scary_Tales%3A_Deadly_Ever_After)                                                     | House      | **unclassified**                                           | Orlando | Soundstage 24           |
| [The Harvest](<https://halloweenhorrornights.fandom.com/wiki/The_Harvest_(2018)>)                                                                                    | Scare zone | Original                                                   | Orlando | Plaza of the Stars      |
| [Vamp '85: New Year's Eve](https://halloweenhorrornights.fandom.com/wiki/Vamp_'85%3A_New_Year's_Eve)                                                                 | Scare zone | Original                                                   | Orlando | New York                |
| [Twisted Tradition](<https://halloweenhorrornights.fandom.com/wiki/Twisted_Tradition_(Scarezone)>)                                                                   | Scare zone | Original                                                   | Orlando | Central Park            |
| [Revenge of Chucky](https://halloweenhorrornights.fandom.com/wiki/Revenge_of_Chucky)                                                                                 | Scare zone | Licensed — Child's Play Franchise (1988-2017)              | Orlando | Hollywood               |
| [Killer Klowns From Outer Space](<https://halloweenhorrornights.fandom.com/wiki/Killer_Klowns_From_Outer_Space_(Scarezone)>)                                         | Scare zone | Licensed — Killer Klowns From Outer Space (1988)           | Orlando | South Street            |

#### 2019 — [Halloween Horror Nights 29](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_29)

| Attraction                                                                                                                                                   | Type       | IP                                                    | Parks   | Venue                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------- | ------- | ----------------------- |
| [Stranger Things](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_(Orlando_2019)>) _(Orlando version)_                                        | House      | Licensed — Stranger Things 2 (2017)                   | Orlando | Soundstage 25           |
| [Nightingales: Blood Pit](https://halloweenhorrornights.fandom.com/wiki/Nightingales%3A_Blood_Pit)                                                           | House      | Original                                              | Orlando | Sprung Tent 1           |
| [Universal Monsters](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters_(Orlando)>)                                                           | House      | Licensed — Universal Classic Monsters                 | Orlando | Second Parade Warehouse |
| [Depths of Fear](https://halloweenhorrornights.fandom.com/wiki/Depths_of_Fear)                                                                               | House      | Original                                              | Orlando | Sprung Tent 2           |
| [Yeti: Terror of the Yukon](https://halloweenhorrornights.fandom.com/wiki/Yeti%3A_Terror_of_the_Yukon)                                                       | House      | Original                                              | Orlando | Soundstage 24           |
| [Ghostbusters](<https://halloweenhorrornights.fandom.com/wiki/Ghostbusters_(Orlando)>) _(Orlando version)_                                                   | House      | Licensed — Ghostbusters                               | Orlando | Soundstage 22           |
| [Killer Klowns From Outer Space](<https://halloweenhorrornights.fandom.com/wiki/Killer_Klowns_From_Outer_Space_(Haunted_House_Orlando)>) _(Orlando version)_ | House      | Licensed — Killer Klowns From Outer Space (1988)      | Orlando | Shrek Theater           |
| [Us](<https://halloweenhorrornights.fandom.com/wiki/Us_(Orlando)>) _(Orlando version)_                                                                       | House      | Licensed — Us (2019)                                  | Orlando | Soundstage 24           |
| [Graveyard Games](https://halloweenhorrornights.fandom.com/wiki/Graveyard_Games)                                                                             | House      | Original                                              | Orlando | Parade Warehouse        |
| [House of 1000 Corpses](<https://halloweenhorrornights.fandom.com/wiki/House_of_1000_Corpses_(Haunted_House_Orlando)>) _(Orlando version)_                   | House      | Licensed — House of 1000 Corpses (2003)               | Orlando | MIB Tent                |
| [Zombieland Double Tap](https://halloweenhorrornights.fandom.com/wiki/Zombieland_Double_Tap)                                                                 | Scare zone | Licensed — The Zombieland Movie Franchise (2009-2019) | Orlando | New York                |
| [Rob Zombie Hellbilly Deluxe](https://halloweenhorrornights.fandom.com/wiki/Rob_Zombie_Hellbilly_Deluxe)                                                     | Scare zone | Licensed — Rob Zombie's Hellbilly Deluxe (1998)       | Orlando | San Francisco           |
| [Anarch-Cade](https://halloweenhorrornights.fandom.com/wiki/Anarch-Cade)                                                                                     | Scare zone | Original                                              | Orlando | Plaza of the Stars      |
| [Vanity Ball](https://halloweenhorrornights.fandom.com/wiki/Vanity_Ball)                                                                                     | Scare zone | Original                                              | Orlando | Hollywood               |
| [Vikings Undead](https://halloweenhorrornights.fandom.com/wiki/Vikings_Undead)                                                                               | Scare zone | Original                                              | Orlando | Central Park            |

#### 2021 — [Halloween Horror Nights 30](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_30)

| Attraction                                                                                                                                                                                   | Type       | IP                                            | Parks   | Venue               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------- | ------- | ------------------- |
| [Case Files Unearthed: Legendary Truth](https://halloweenhorrornights.fandom.com/wiki/Case_Files_Unearthed%3A_Legendary_Truth)                                                               | House      | Original                                      | Orlando | Shrek Theater       |
| [Universal Monsters: The Bride of Frankenstein Lives](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_The_Bride_of_Frankenstein_Lives_(Hollywood)>) _(Orlando version)_ | House      | Licensed — Universal Classic Monsters         | Orlando | Soundstage 23A      |
| [The Texas Chainsaw Massacre](<https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre_(Orlando_2021)>) _(Orlando version)_                                                | House      | Licensed — The Texas Chainsaw Massacre (1974) | Orlando | Soundstage 23B      |
| [Revenge of the Tooth Fairy](https://halloweenhorrornights.fandom.com/wiki/Revenge_of_the_Tooth_Fairy)                                                                                       | House      | Original                                      | Orlando | Soundstage 24A      |
| [HHN Icons: Captured](https://halloweenhorrornights.fandom.com/wiki/HHN_Icons%3A_Captured)                                                                                                   | House      | Original                                      | Orlando | Soundstage 24B      |
| [Welcome to SCarey: Horror in the Heartland](https://halloweenhorrornights.fandom.com/wiki/Welcome_to_SCarey%3A_Horror_in_the_Heartland)                                                     | House      | Original                                      | Orlando | MIB Tent            |
| [Puppet Theatre: Captive Audience](https://halloweenhorrornights.fandom.com/wiki/Puppet_Theatre%3A_Captive_Audience)                                                                         | House      | Original                                      | Orlando | Sprung Tent 1       |
| [The Wicked Growth: Realm of the Pumpkin](https://halloweenhorrornights.fandom.com/wiki/The_Wicked_Growth%3A_Realm_of_the_Pumpkin)                                                           | House      | Original                                      | Orlando | Sprung Tent 2       |
| [Beetlejuice](<https://halloweenhorrornights.fandom.com/wiki/Beetlejuice_(Haunted_House)>)                                                                                                   | House      | Licensed — Beetlejuice (1988)                 | Orlando | Parade Warehouse    |
| [The Hau](<https://halloweenhorrornights.fandom.com/wiki/The_Haunting_of_Hill_House_(Haunted_House_Orlando)>)                                                                                | House      | Licensed — The Haunting of Hill House (2018)  | Orlando | nting of Hill House |
| [Crypt TV](https://halloweenhorrornights.fandom.com/wiki/Crypt_TV)                                                                                                                           | Scare zone | Licensed — Crypt TV (2015-2021)               | Orlando | San Francisco       |
| [30 Years 30 Fears](https://halloweenhorrornights.fandom.com/wiki/30_Years_30_Fears)                                                                                                         | Scare zone | Original                                      | Orlando | Plaza of the Stars  |
| [Seek and Destroy](https://halloweenhorrornights.fandom.com/wiki/Seek_and_Destroy)                                                                                                           | Scare zone | Original                                      | Orlando | New York            |
| [Gorewood Forest (Scarezone)](<https://halloweenhorrornights.fandom.com/wiki/Gorewood_Forest_(Scarezone)>)                                                                                   | Scare zone | Original                                      | Orlando | Central Park        |
| [Lights Camera Hacktion: Eddie's Revenge](https://halloweenhorrornights.fandom.com/wiki/Lights_Camera_Hacktion%3A_Eddie's_Revenge)                                                           | Scare zone | Original                                      | Orlando | Hollywood           |

#### 2022 — [Halloween Horror Nights 31](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_31)

| Attraction                                                                                                                                                 | Type       | IP                                    | Parks   | Venue                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------- | ------- | ----------------------- |
| [Spirits of the Coven](https://halloweenhorrornights.fandom.com/wiki/Spirits_of_the_Coven)                                                                 | House      | Original                              | Orlando | Soundstage 22           |
| [Hellblock Horror](https://halloweenhorrornights.fandom.com/wiki/Hellblock_Horror)                                                                         | House      | Original                              | Orlando | Soundstage 23A          |
| [Halloween](<https://halloweenhorrornights.fandom.com/wiki/Halloween_(Orlando_2022)>) _(Orlando version)_                                                  | House      | Licensed — Halloween (1978)           | Orlando | Soundstage 23B          |
| [Fiesta de Chupacabras](<https://halloweenhorrornights.fandom.com/wiki/Fiesta_de_Chupacabras_(Haunted_House)>)                                             | House      | Original                              | Orlando | Soundstage 24A          |
| [Dead Man’s Pier: Winter’s Wake](https://halloweenhorrornights.fandom.com/wiki/Dead_Man's_Pier%3A_Winter's_Wake)                                           | House      | Original                              | Orlando | Soundstage 24B          |
| [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Orlando_2022)>) _(Orlando version)_                    | House      | Licensed — Freaky (2020)              | Orlando | Fast & Furious Location |
| [Universal Monsters: Legends Collide](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Legends_Collide_(Orlando)>) _(Orlando version)_ | House      | Licensed — Universal Classic Monsters | Orlando | Parade Warehouse        |
| [The Weeknd: After Hours Nightmare](<https://halloweenhorrornights.fandom.com/wiki/The_Weeknd%3A_After_Hours_Nightmare_(Orlando)>) _(Orlando version)_     | House      | Licensed — After Hours (2020)         | Orlando | Second Parade Warehouse |
| [Descendants of Destruction](https://halloweenhorrornights.fandom.com/wiki/Descendants_of_Destruction)                                                     | House      | Original                              | Orlando | Sprung Tent 1           |
| [Bugs: Eaten Alive](<https://halloweenhorrornights.fandom.com/wiki/Bugs%3A_Eaten_Alive_(Haunted_House)>)                                                   | House      | Original                              | Orlando | Sprung Tent 2           |
| [Horrors of Halloween](https://halloweenhorrornights.fandom.com/wiki/Horrors_of_Halloween)                                                                 | Scare zone | Original                              | Orlando | Plaza of the Stars      |
| [Sweet Revenge](<https://halloweenhorrornights.fandom.com/wiki/Sweet_Revenge_(Scarezone)>)                                                                 | Scare zone | Original                              | Orlando | New York                |
| [Conjure the Dark](https://halloweenhorrornights.fandom.com/wiki/Conjure_the_Dark)                                                                         | Scare zone | Original                              | Orlando | San Francisco           |
| [Scarecrow: Cursed Soil](https://halloweenhorrornights.fandom.com/wiki/Scarecrow%3A_Cursed_Soil)                                                           | Scare zone | Original                              | Orlando | Central Park            |
| [Graveyard: Deadly Unrest](https://halloweenhorrornights.fandom.com/wiki/Graveyard%3A_Deadly_Unrest)                                                       | Scare zone | Original                              | Orlando | Hollywood               |

#### 2023 — [Halloween Horror Nights 32](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_32)

| Attraction                                                                                                                                   | Type       | IP                                                     | Parks               | Venue                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ | ------------------- | ------------------------------------------------ |
| [The Exorcist: Believer](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist%3A_Believer_(Orlando)>)                                 | House      | Licensed — The Exorcist: Believer (2023)               | Hollywood + Orlando | Orlando: Soundstage 22; Hollywood: Soundstage 22 |
| [Blood Moon: Dark Offerings](<https://halloweenhorrornights.fandom.com/wiki/Blood_Moon%3A_Dark_Offerings_(Haunted_House)>)                   | House      | Original                                               | Orlando             | Soundstage 23A                                   |
| [Stranger Things 4](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_4_(Orlando)>) _(Orlando version)_                         | House      | Licensed — Stranger Things 4                           | Orlando             | Soundstage 23B                                   |
| [Dueling Dragons: Choose Thy Fate](<https://halloweenhorrornights.fandom.com/wiki/Dueling_Dragons%3A_Choose_Thy_Fate_(Haunted_House)>)       | House      | Original                                               | Orlando             | Soundstage 24A                                   |
| [YETI: Campground Kills](<https://halloweenhorrornights.fandom.com/wiki/YETI%3A_Campground_Kills_(Haunted_House)>)                           | House      | Original                                               | Orlando             | Soundstage 24B                                   |
| [Chucky: Ultimate Kill Count](<https://halloweenhorrornights.fandom.com/wiki/Chucky%3A_Ultimate_Kill_Count_(Orlando)>) _(Orlando version)_   | House      | Licensed — Child's Play/Chucky Syfy TV Series/Original | Orlando             | Fast & Furious Location                          |
| [Universal Monsters: Unmasked](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Unmasked_(Orlando)>) _(Orlando version)_ | House      | Licensed — Universal Classic Monsters                  | Orlando             | Parade Warehouse                                 |
| [The Last of Us](<https://halloweenhorrornights.fandom.com/wiki/The_Last_of_Us_(Orlando)>) _(Orlando version)_                               | House      | Licensed — The Last of Us (video games)                | Orlando             | Second Parade Warehouse                          |
| [The Darkest Deal](<https://halloweenhorrornights.fandom.com/wiki/The_Darkest_Deal_(Haunted_House)>)                                         | House      | Original                                               | Orlando             | Sprung Tent 1                                    |
| [Dr. Oddfellow's Twisted Origins](https://halloweenhorrornights.fandom.com/wiki/Dr._Oddfellow's_Twisted_Origins)                             | House      | Original                                               | Orlando             | Sprung Tent 2                                    |
| [Dr. Oddfellow's Collection of Horror](<https://halloweenhorrornights.fandom.com/wiki/Dr._Oddfellow's_Collection_of_Horror_(Scarezone)>)     | Scare zone | Original                                               | Orlando             | Front Lot                                        |
| [Dark Zodiac](https://halloweenhorrornights.fandom.com/wiki/Dark_Zodiac)                                                                     | Scare zone | Original                                               | Orlando             | Hollywood                                        |
| [Jungle of Doom: Expedition Horror](https://halloweenhorrornights.fandom.com/wiki/Jungle_of_Doom%3A_Expedition_Horror)                       | Scare zone | Original                                               | Orlando             | Central Park                                     |
| [Vamp '69: Summer of Blood](<https://halloweenhorrornights.fandom.com/wiki/Vamp_'69%3A_Summer_of_Blood_(Scarezone)>)                         | Scare zone | Original                                               | Orlando             | New York                                         |
| [Shipyard 32: Horrors Unhinged](https://halloweenhorrornights.fandom.com/wiki/Shipyard_32%3A_Horrors_Unhinged)                               | Scare zone | Original                                               | Orlando             | San Francisco                                    |

#### 2024 — [Halloween Horror Nights 33](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_33)

| Attraction                                                                                                                                                       | Type       | IP                                            | Parks   | Venue                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------- | ------- | ----------------------- |
| [A Quiet Place](<https://halloweenhorrornights.fandom.com/wiki/A_Quiet_Place_(Orlando_2024)>) _(Orlando version)_                                                | House      | Licensed — A Quiet Place (Franchise)          | Orlando | Soundstage 22           |
| [Monstruos: The Monsters of Latin America](<https://halloweenhorrornights.fandom.com/wiki/Monstruos%3A_The_Monsters_of_Latin_America_(Orlando)>)                 | House      | Original                                      | Orlando | Soundstage 23A          |
| [Ghostbusters: Frozen Empire](<https://halloweenhorrornights.fandom.com/wiki/Ghostbusters%3A_Frozen_Empire_(Orlando)>) _(Orlando version)_                       | House      | Licensed — Ghostbusters: Frozen Empire (2024) | Orlando | Soundstage 23B          |
| [Insidious: The Further](<https://halloweenhorrornights.fandom.com/wiki/Insidious%3A_The_Further_(Orlando)>) _(Orlando version)_                                 | House      | Licensed — Insidious                          | Orlando | Soundstage 24A          |
| [Triplets of Terror](https://halloweenhorrornights.fandom.com/wiki/Triplets_of_Terror)                                                                           | House      | Original                                      | Orlando | Soundstage 24B          |
| [Major Sweets Candy Factory](https://halloweenhorrornights.fandom.com/wiki/Major_Sweets_Candy_Factory)                                                           | House      | Original                                      | Orlando | Fast & Furious Location |
| [The Museum: Deadly Exhibits](https://halloweenhorrornights.fandom.com/wiki/The_Museum%3A_Deadly_Exhibits)                                                       | House      | Original                                      | Orlando | Sprung Tent 1           |
| [Slaughter Sinema 2](https://halloweenhorrornights.fandom.com/wiki/Slaughter_Sinema_2)                                                                           | House      | Original                                      | Orlando | Sprung Tent 2           |
| [Universal Monsters: Eternal Bloodlines](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Eternal_Bloodlines_(Orlando)>) _(Orlando version)_ | House      | Licensed — Universal Classic Monsters         | Orlando | Sprung Tent 3           |
| [Goblin’s Feast](https://halloweenhorrornights.fandom.com/wiki/Goblin%E2%80%99s_Feast)                                                                           | House      | Original                                      | Orlando | Sprung Tent 4           |
| [Duality of Fear](https://halloweenhorrornights.fandom.com/wiki/Duality_of_Fear)                                                                                 | Scare zone | Original                                      | Orlando | Front Lot               |
| [Demon Queens](https://halloweenhorrornights.fandom.com/wiki/Demon_Queens)                                                                                       | Scare zone | Original                                      | Orlando | Hollywood               |
| [Swamp of The Undead](https://halloweenhorrornights.fandom.com/wiki/Swamp_of_The_Undead)                                                                         | Scare zone | Original                                      | Orlando | Central Park            |
| [Torture Faire](https://halloweenhorrornights.fandom.com/wiki/Torture_Faire)                                                                                     | Scare zone | Original                                      | Orlando | New York                |
| [Enter the Blumhouse](https://halloweenhorrornights.fandom.com/wiki/Enter_the_Blumhouse)                                                                         | Scare zone | Licensed — Blumhouse Productions              | Orlando | San Francisco           |

#### 2025 — [Halloween Horror Nights 34](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_34)

| Attraction                                                                                                                                                                   | Type       | IP                                                    | Parks               | Venue                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------- | ------------------- | ------------------------------------------------- |
| [El Artista: A Spanish Haunting](<https://halloweenhorrornights.fandom.com/wiki/El_Artista%3A_A_Spanish_Haunting_(Haunted_House)>)                                           | House      | Original                                              | Orlando             | Soundstage 22                                     |
| [WWE Presents: The Horrors of The Wyatt Sicks](<https://halloweenhorrornights.fandom.com/wiki/WWE_Presents%3A_The_Horrors_of_The_Wyatt_Sicks_(Orlando)>) _(Orlando version)_ | House      | Licensed — The Wyatt Sicks                            | Orlando             | Soundstage 23A                                    |
| [Five Nights at Freddy's](<https://halloweenhorrornights.fandom.com/wiki/Five_Nights_at_Freddy's_(Orlando)>)                                                                 | House      | Licensed — Five Nights at Freddy's (2023)             | Hollywood + Orlando | Orlando: Soundstage 23B; Hollywood: Soundstage 15 |
| [Grave of Flesh](<https://halloweenhorrornights.fandom.com/wiki/Grave_of_Flesh_(Haunted_House)>)                                                                             | House      | Original                                              | Orlando             | Soundstage 24B                                    |
| [Terrifier](<https://halloweenhorrornights.fandom.com/wiki/Terrifier_(Orlando)>) _(Orlando version)_                                                                         | House      | Licensed — Terrifier (Trilogy) (2016-2024)            | Orlando             | Soundstage 25                                     |
| [Jason Universe](<https://halloweenhorrornights.fandom.com/wiki/Jason_Universe_(Orlando)>) _(Orlando version)_                                                               | House      | Licensed — Friday the 13th (Franchise)/Jason Universe | Orlando             | Fast & Furious Location                           |
| [Hatchet and Chains: Demon Bounty Hunters](<https://halloweenhorrornights.fandom.com/wiki/Hatchet_and_Chains%3A_Demon_Bounty_Hunters_(Haunted_House)>)                       | House      | Original                                              | Orlando             | Sprung Tent 1                                     |
| [Dolls: Let's Play Dead](https://halloweenhorrornights.fandom.com/wiki/Dolls%3A_Let%E2%80%99s_Play_Dead)                                                                     | House      | Original                                              | Orlando             | Sprung Tent 2                                     |
| [Gálkn: Monsters of the North](https://halloweenhorrornights.fandom.com/wiki/G%C3%A1lkn%3A_Monsters_of_the_North)                                                            | House      | Original                                              | Orlando             | Sprung Tent 3                                     |
| [Fallout](<https://halloweenhorrornights.fandom.com/wiki/Fallout_(Orlando)>) _(Orlando version)_                                                                             | House      | Licensed — Fallout Season 1 (2024)                    | Orlando             | Sprung Tent 4                                     |
| [The Origins of Horror](https://halloweenhorrornights.fandom.com/wiki/The_Origins_of_Horror)                                                                                 | Scare zone | Original                                              | Orlando             | Plaza of the Stars                                |
| [Masquerade: Dance with Death](https://halloweenhorrornights.fandom.com/wiki/Masquerade%3A_Dance_with_Death)                                                                 | Scare zone | Original                                              | Orlando             | Hollywood                                         |
| [The Cat Lady of Crooked Lane](<https://halloweenhorrornights.fandom.com/wiki/The_Cat_Lady_of_Crooked_Lane_(Scarezone)>)                                                     | Scare zone | Original                                              | Orlando             | Central Park                                      |
| [Mutations: Toxic Twenties](<https://halloweenhorrornights.fandom.com/wiki/Mutations%3A_Toxic_Twenties_(Scarezone)>)                                                         | Scare zone | Original                                              | Orlando             | New York                                          |
| [Mel's Die-In Zombies](https://halloweenhorrornights.fandom.com/wiki/Mel's_Die-In_Zombies)                                                                                   | Scare zone | Original                                              | Orlando             | Mel's Drive-In                                    |
| [Club Horror](https://halloweenhorrornights.fandom.com/wiki/Club_Horror)                                                                                                     | Scare zone | Original                                              | Orlando             | San Francisco                                     |

#### 2026 — [Halloween Horror Nights 35](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_35)

| Attraction                                                                                                                                                     | Type       | IP                                                                                              | Parks   | Venue                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- | ------- | ----------------------- |
| [Jack & Oddfellow: Chaos & Control](https://halloweenhorrornights.fandom.com/wiki/Jack_%26_Oddfellow%3A_Chaos_%26_Control)                                     | House      | Original                                                                                        | Orlando | Soundstage 22           |
| [Evil Dead Burn](<https://halloweenhorrornights.fandom.com/wiki/Evil_Dead_Burn_(Orlando)>) _(Orlando version)_                                                 | House      | Licensed — Evil Dead Burn (2026)                                                                | Orlando | Soundstage 23A          |
| [Stranger Things 5](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_5_(Orlando)>) _(Orlando version)_                                           | House      | Licensed — Stranger Things 5 (2025)                                                             | Orlando | Soundstage 23B          |
| [Ozzy Osbourne: Prince of Darkness](<https://halloweenhorrornights.fandom.com/wiki/Ozzy_Osbourne%3A_Prince_of_Darkness_(Orlando)>) _(Orlando version)_         | House      | Licensed — Ozzy Osbourne                                                                        | Orlando | Soundstage 24A          |
| [Madlands: Caged Cannibals](https://halloweenhorrornights.fandom.com/wiki/Madlands%3A_Caged_Cannibals)                                                         | House      | Original                                                                                        | Orlando | Soundstage 24B          |
| [Cybergoria](https://halloweenhorrornights.fandom.com/wiki/Cybergoria)                                                                                         | House      | Original                                                                                        | Orlando | Fast & Furious Location |
| [INVASION: Alien Abduction](https://halloweenhorrornights.fandom.com/wiki/INVASION%3A_Alien_Abduction)                                                         | House      | Original                                                                                        | Orlando | Sprung Tent 1           |
| [H.R. Bloodengutz Presents: A Halloween Fright-Tacular](https://halloweenhorrornights.fandom.com/wiki/H.R._Bloodengutz_Presents%3A_A_Halloween_Fright-Tacular) | House      | Original                                                                                        | Orlando | Sprung Tent 2           |
| [Sinners](<https://halloweenhorrornights.fandom.com/wiki/Sinners_(Orlando)>) _(Orlando version)_                                                               | House      | Licensed — Sinners (2025)                                                                       | Orlando | Sprung Tent 3           |
| [Hellraiser](<https://halloweenhorrornights.fandom.com/wiki/Hellraiser_(Orlando)>) _(Orlando version)_                                                         | House      | Licensed — Hellraiser (1987)Hellbound: Hellraiser II (1988)Hellraiser III: Hell on Earth (1992) | Orlando | Sprung Tent 4           |
| [Infernal Carnival of Nightmares](<https://halloweenhorrornights.fandom.com/wiki/Infernal_Carnival_of_Nightmares_(Scarezone)>)                                 | Scare zone | Original                                                                                        | Orlando | Illumination Boulevard  |
| [Downtown Clowntown](<https://halloweenhorrornights.fandom.com/wiki/Downtown_Clowntown_(Scarezone)>)                                                           | Scare zone | Original                                                                                        | Orlando | New York                |
| [Fortnitemares](<https://halloweenhorrornights.fandom.com/wiki/Fortnitemares_(Orlando)>) _(Orlando version)_                                                   | Scare zone | Licensed — Fortnite                                                                             | Orlando | Central Park            |
| [Sideshow of Decay](https://halloweenhorrornights.fandom.com/wiki/Sideshow_of_Decay)                                                                           | Scare zone | Original                                                                                        | Orlando | Hollywood               |
| [Mel's Die-In Zombies](https://halloweenhorrornights.fandom.com/wiki/Mel's_Die-In_Zombies)                                                                     | Scare zone | Original                                                                                        | Orlando | Mel's Drive-In          |
| [Club Horror](https://halloweenhorrornights.fandom.com/wiki/Club_Horror)                                                                                       | Scare zone | Original                                                                                        | Orlando | San Francisco           |

### Universal Studios Hollywood

#### 2010 — [Halloween Horror Nights 2010 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2010_(Hollywood)>)

| Attraction                                                                                                                                                         | Type                       | IP                                                         | Parks     | Venue            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------- | --------- | ---------------- |
| [A Nightmare on Elm Street: Never Sleep Again](https://halloweenhorrornights.fandom.com/wiki/A_Nightmare_on_Elm_Street%3A_Never_Sleep_Again)                       | House                      | Licensed — A Nightmare on Elm Street (2010)                | Hollywood | Shrek 4D Queue   |
| [Friday the 13th: Kill, Jason, Kill](https://halloweenhorrornights.fandom.com/wiki/Friday_the_13th%3A_Kill_Jason_Kill)                                             | House                      | Licensed — Friday the 13th (2009)                          | Hollywood | Wild West Stage  |
| [SAW: Game On](https://halloweenhorrornights.fandom.com/wiki/SAW%3A_Game_On)                                                                                       | House                      | Licensed — SAW Franchise (2004-2010)                       | Hollywood | Mummy Venue      |
| [Vampyre: Castle of the Undead](https://halloweenhorrornights.fandom.com/wiki/Vampyre%3A_Castle_of_the_Undead)                                                     | House                      | Original                                                   | Hollywood | UBE Venue        |
| [Rob Zombie's House of 1000 Corpses: In 3-D Zombievision](https://halloweenhorrornights.fandom.com/wiki/Rob_Zombie's_House_of_1000_Corpses%3A_In_3-D_Zombievision) | House                      | Licensed — House of 1000 Corpses (2003)                    | Hollywood | Terminator Queue |
| [Terror Tram: Chucky's Revenge](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Chucky's_Revenge)                                                     | Scare zone _(Terror Tram)_ | Licensed — Child's Play                                    | Hollywood | Backlot          |
| [La Llorona](<https://halloweenhorrornights.fandom.com/wiki/La_Llorona_(Scarezone)>)                                                                               | Scare zone                 | Licensed — The Urban Legend of La Llorona                  | Hollywood | Western Street   |
| [Nightmarez](https://halloweenhorrornights.fandom.com/wiki/Nightmarez)                                                                                             | Scare zone                 | Licensed — A Nightmare on Elm Street Franchise (1984-2010) | Hollywood | Front Gates      |
| [Klownz](https://halloweenhorrornights.fandom.com/wiki/Klownz)                                                                                                     | Scare zone                 | Original                                                   | Hollywood | New York Street  |
| [Lunaticz](https://halloweenhorrornights.fandom.com/wiki/Lunaticz)                                                                                                 | Scare zone                 | Original                                                   | Hollywood | Baker Street     |
| [Freakz](https://halloweenhorrornights.fandom.com/wiki/Freakz)                                                                                                     | Scare zone                 | Original                                                   | Hollywood | French Street    |
| [Pigz](https://halloweenhorrornights.fandom.com/wiki/Pigz)                                                                                                         | Scare zone                 | Licensed — SAW Franchise (2004-2010)                       | Hollywood | Lower Lot        |

#### 2011 — [Halloween Horror Nights 2011 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2011_(Hollywood)>)

| Attraction                                                                                                                                                         | Type                       | IP                                                                       | Parks     | Venue               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------ | --------- | ------------------- |
| [Hostel: Hunting Season](https://halloweenhorrornights.fandom.com/wiki/Hostel%3A_Hunting_Season)                                                                   | House                      | Licensed — Hostel (2005) & Hostel 2 (2007)                               | Hollywood | Mummy Venue         |
| [Alice Cooper: Welcome to My Nightmare](<https://halloweenhorrornights.fandom.com/wiki/Alice_Cooper%3A_Welcome_to_My_Nightmare_(Hollywood)>)                       | House                      | Licensed — Welcome to My Nightmare (1975)/ Welcome 2 My Nightmare (2012) | Hollywood | Jurassic Park Queue |
| [The Thing: Assimilation](<https://halloweenhorrornights.fandom.com/wiki/The_Thing%3A_Assimilation_(2011)>)                                                        | House                      | Licensed — The Thing (2011)                                              | Hollywood | Wild West Stage     |
| [Rob Zombie's House of 1000 Corpses: In 3-D Zombievision](https://halloweenhorrornights.fandom.com/wiki/Rob_Zombie's_House_of_1000_Corpses%3A_In_3-D_Zombievision) | House                      | Licensed — House of 1000 Corpses (2003)                                  | Hollywood | Terminator Queue    |
| [The Wolfman: Curse of Talbot Hall](https://halloweenhorrornights.fandom.com/wiki/The_Wolfman%3A_The_Curse_of_Talbot_Hall)                                         | House                      | Licensed — The Wolfman (2010)                                            | Hollywood | UBE Venue           |
| [La Llorona: Villa de Almas Perdidas](https://halloweenhorrornights.fandom.com/wiki/La_Llorona%3A_Villa_de_Almas_Perdidas)                                         | House                      | Licensed — The Urban Legend Of La Llorona                                | Hollywood | Shrek 4D Queue      |
| [Terror Tram: Scream 4 Your Life](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Scream_4_Your_Life)                                                 | Scare zone _(Terror Tram)_ | Licensed — Various Horror Films                                          | Hollywood | Backlot             |
| [Scream](<https://halloweenhorrornights.fandom.com/wiki/Scream_(Scarezone)>)                                                                                       | Scare zone                 | Licensed — Scream Franchise (1996-2011)                                  | Hollywood | Front Gates         |
| [Zombieville](https://halloweenhorrornights.fandom.com/wiki/Zombieville)                                                                                           | Scare zone                 | Original                                                                 | Hollywood | Baker Street        |
| [The Reapers](https://halloweenhorrornights.fandom.com/wiki/The_Reapers)                                                                                           | Scare zone                 | Original                                                                 | Hollywood | Lower Lot           |
| [Klownz](https://halloweenhorrornights.fandom.com/wiki/Klownz)                                                                                                     | Scare zone                 | Original                                                                 | Hollywood | New York Street     |
| [Freakz](https://halloweenhorrornights.fandom.com/wiki/Freakz)                                                                                                     | Scare zone                 | Original                                                                 | Hollywood | French Street       |

#### 2012 — [Halloween Horror Nights 2012 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2012_(Hollywood)>)

| Attraction                                                                                                                                         | Type                       | IP                                                                   | Parks     | Venue               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- | --------- | ------------------- |
| [The Walking Dead: Dead Inside](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_Dead_Inside_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — The Walking Dead (2010-2012)                              | Hollywood | Wild West Stage     |
| [The Texas Chainsaw Massacre: The Saw is the Law](https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre%3A_The_Saw_is_the_Law) | House                      | Licensed — The Texas Chainsaw Massacre (1974)                        | Hollywood | Jurassic Park Queue |
| [Welcome to Silent Hill](<https://halloweenhorrornights.fandom.com/wiki/Welcome_to_Silent_Hill_(Hollywood)>) _(Hollywood version)_                 | House                      | Licensed — Silent Hill (Franchise) (1999-2012)                       | Hollywood | Mummy Venue         |
| [La Llorona: La Cazadora de Niños](https://halloweenhorrornights.fandom.com/wiki/La_Llorona%3A_La_Cazadora_de_Ni%C3%B1os)                          | House                      | Licensed — The Urban Legend of La Llorona                            | Hollywood | Shrek 4D Queue      |
| [Alice Cooper Goes to Hell 3D](https://halloweenhorrornights.fandom.com/wiki/Alice_Cooper_Goes_to_Hell_3D)                                         | House                      | Licensed — Alice Cooper/Alice Cooper Goes to Hell                    | Hollywood | Terminator Queue    |
| [Universal Monsters Remix](https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters_Remix)                                                 | House                      | Licensed — Universal Classic Horror Films/Universal Classic Monsters | Hollywood | UBE Venue           |
| [Terror Tram: Invaded by The Walking Dead](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Invaded_by_The_Walking_Dead)               | Scare zone _(Terror Tram)_ | Licensed — The Walking Dead (2010-2014)                              | Hollywood | Studio Tour Backlot |
| [Silent Hill](<https://halloweenhorrornights.fandom.com/wiki/Silent_Hill_(Scarezone)>)                                                             | Scare zone                 | Licensed — Silent Hill franchise (1999-2012)                         | Hollywood | Lower Lot           |
| [Toyz](https://halloweenhorrornights.fandom.com/wiki/Toyz)                                                                                         | Scare zone                 | Original                                                             | Hollywood | Baker Street        |
| [Witchez](https://halloweenhorrornights.fandom.com/wiki/Witchez)                                                                                   | Scare zone                 | Original                                                             | Hollywood | French Street       |
| [Klownz](https://halloweenhorrornights.fandom.com/wiki/Klownz)                                                                                     | Scare zone                 | Original                                                             | Hollywood | Front Gates         |

#### 2013 — [Halloween Horror Nights 2013 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2013_(Hollywood)>)

| Attraction                                                                                                                                             | Type                       | IP                                             | Parks     | Venue               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------- | --------- | ------------------- |
| [Black Sabbath: 13-3D](https://halloweenhorrornights.fandom.com/wiki/Black_Sabbath%3A_13-3D)                                                           | House                      | Licensed — The Music of Black Sabbath          | Hollywood | Soundstage 747      |
| [El Cucuy: The Boogeyman](https://halloweenhorrornights.fandom.com/wiki/El_Cucuy%3A_The_Boogeyman)                                                     | House                      | Licensed — The legend of El Cucuy              | Hollywood | Parisian Courtyard  |
| [Evil Dead: Book of the Dead](https://halloweenhorrornights.fandom.com/wiki/Evil_Dead%3A_Book_of_the_Dead)                                             | House                      | Licensed — Evil Dead (2013)                    | Hollywood | Mummy Venue         |
| [Insidious: Into the Further](https://halloweenhorrornights.fandom.com/wiki/Insidious%3A_Into_the_Further)                                             | House                      | Licensed — Insidious Franchise (2010-2013)     | Hollywood | Jurassic Park Queue |
| [Universal Monsters Remix: Resurrection](https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters_Remix%3A_Resurrection)                       | House                      | Licensed — Universal Classic Monsters          | Hollywood | UBE Venue           |
| [The Walking Dead: No Safe Haven](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_No_Safe_Haven_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — The Walking Dead Series (2010-2013) | Hollywood | Metro Sets Tent     |
| [Terror Tram: Invaded by The Walking Dead](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Invaded_by_The_Walking_Dead)                   | Scare zone _(Terror Tram)_ | Licensed — The Walking Dead (2010-2014)        | Hollywood | Backlot             |
| [Cirque Du Klownz](https://halloweenhorrornights.fandom.com/wiki/Cirque_Du_Klownz)                                                                     | Scare zone                 | Original                                       | Hollywood | French Street       |
| [The Curse of Chucky](https://halloweenhorrornights.fandom.com/wiki/The_Curse_of_Chucky)                                                               | Scare zone                 | Licensed — Curse of Chucky (2013)              | Hollywood | Baker Street        |
| [The Purge: Survive the Night](https://halloweenhorrornights.fandom.com/wiki/The_Purge%3A_Survive_the_Night)                                           | Scare zone                 | Licensed — The Purge (2013)                    | Hollywood | Front Gates         |
| [Scarecrowz](https://halloweenhorrornights.fandom.com/wiki/Scarecrowz)                                                                                 | Scare zone                 | Original                                       | Hollywood | Lower Lot           |
| [The Walking Dead: Dead on Arrival](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_Dead_on_Arrival)                                 | Scare zone                 | Licensed — The Walking Dead (2010-2013)        | Hollywood | Metro Lot           |

#### 2014 — [Halloween Horror Nights 2014 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2014_(Hollywood)>)

| Attraction                                                                                                                                                 | Type                       | IP                                               | Parks     | Venue               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ | --------- | ------------------- |
| [An American Werewolf in London](<https://halloweenhorrornights.fandom.com/wiki/An_American_Werewolf_in_London_(Hollywood)>)                               | House                      | Licensed — An American Werewolf in London (1981) | Hollywood | Jurassic Park Queue |
| [AVP: Alien vs. Predator](<https://halloweenhorrornights.fandom.com/wiki/AVP%3A_Alien_vs._Predator_(Hollywood)>) _(Hollywood version)_                     | House                      | Licensed — Alien Franchise (1979-1997)           | Hollywood | Soundstage 747      |
| [Clowns 3D: Music by Slash](https://halloweenhorrornights.fandom.com/wiki/Clowns_3D%3A_Music_by_Slash)                                                     | House                      | Original                                         | Hollywood | Mummy Venue         |
| [Dracula Untold: Reign of Blood](<https://halloweenhorrornights.fandom.com/wiki/Dracula_Untold%3A_Reign_of_Blood_(Hollywood)>) _(Hollywood version)_       | House                      | Licensed — Dracula Untold (2014)                 | Hollywood | Parisian Courtyard  |
| [Face Off: In the Flesh](<https://halloweenhorrornights.fandom.com/wiki/Face_Off%3A_In_the_Flesh_(Hollywood)>) _(Hollywood version)_                       | House                      | Licensed — FaceOff TV Show (2011-2014)           | Hollywood | UBE Venue           |
| [From Dusk Till Dawn](<https://halloweenhorrornights.fandom.com/wiki/From_Dusk_Till_Dawn_(Hollywood)>) _(Hollywood version)_                               | House                      | Licensed — From Dusk Till Dawn: The Series       | Hollywood | FDTD Area           |
| [The Walking Dead: End of the Line](<https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_End_of_the_Line_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — The Walking Dead (2010-2014)          | Hollywood | Metro Sets Tent     |
| [Terror Tram: Invaded by The Walking Dead](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Invaded_by_The_Walking_Dead)                       | Scare zone _(Terror Tram)_ | Licensed — The Walking Dead (2010-2014)          | Hollywood | Backlot             |
| [Dark Christmas](https://halloweenhorrornights.fandom.com/wiki/Dark_Christmas)                                                                             | Scare zone                 | Original                                         | Hollywood | Baker Street        |
| [Mask-a-Raid](https://halloweenhorrornights.fandom.com/wiki/Mask-a-Raid)                                                                                   | Scare zone                 | Original                                         | Hollywood | French Street       |
| [The Purge: Anarchy](<https://halloweenhorrornights.fandom.com/wiki/The_Purge%3A_Anarchy_(Hollywood)>) _(Hollywood version)_                               | Scare zone                 | Licensed — The Purge Franchise (2013-2014)       | Hollywood | Front Gates         |
| [Skullz](https://halloweenhorrornights.fandom.com/wiki/Skullz)                                                                                             | Scare zone                 | Original                                         | Hollywood | Lower Lot           |
| [The Walking Dead: Welcome to Terminus](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_Welcome_to_Terminus)                             | Scare zone                 | Licensed — The Walking Dead (2010-2014)          | Hollywood | Metro Lot           |

#### 2015 — [Halloween Horror Nights 2015 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2015_(Hollywood)>)

| Attraction                                                                                                                 | Type                       | IP                                         | Parks     | Venue               |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------ | --------- | ------------------- |
| [Crimson Peak: Maze of Madness](https://halloweenhorrornights.fandom.com/wiki/Crimson_Peak%3A_Maze_of_Madness)             | House                      | Licensed — Crimson Peak (2015)             | Hollywood | Metro Sets Tent     |
| [Insidious: Return to the Further](https://halloweenhorrornights.fandom.com/wiki/Insidious%3A_Return_to_the_Further)       | House                      | Licensed — Insidious Franchise (2010-2015) | Hollywood | Jurassic Park Queue |
| [The Walking Dead: Wolves Not Far](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead%3A_Wolves_Not_Far)       | House                      | Licensed — The Walking Dead (2010-2015)    | Hollywood | Soundstage 28 Tent  |
| [Halloween: Michael Myers Comes Home](https://halloweenhorrornights.fandom.com/wiki/Halloween%3A_Michael_Myers_Comes_Home) | House                      | Licensed — Halloween Franchise (1978-2009) | Hollywood | Parisian Courtyard  |
| [This is The End 3D](https://halloweenhorrornights.fandom.com/wiki/This_is_The_End_3D)                                     | House                      | Licensed — This is the End (2013)          | Hollywood | Mummy Venue         |
| [AVP: Alien vs. Predator](<https://halloweenhorrornights.fandom.com/wiki/AVP%3A_Alien_vs._Predator_(Hollywood)>)           | House                      | Licensed — Alien Franchise (1979-1997)     | Hollywood | Soundstage 747      |
| [Terror Tram: Survive the Purge](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Survive_the_Purge)           | Scare zone _(Terror Tram)_ | Licensed — The Purge Franchise (2014-2015) | Hollywood |                     |
| [Exterminatorz](https://halloweenhorrornights.fandom.com/wiki/Exterminatorz)                                               | Scare zone                 | Original                                   | Hollywood | Front Gates         |
| [Dark Christmas](https://halloweenhorrornights.fandom.com/wiki/Dark_Christmas)                                             | Scare zone                 | Original                                   | Hollywood | Baker Street        |
| [Corpz](https://halloweenhorrornights.fandom.com/wiki/Corpz)                                                               | Scare zone                 | Original                                   | Hollywood | French Street       |
| [The Purge: Urban Nightmare](https://halloweenhorrornights.fandom.com/wiki/The_Purge%3A_Urban_Nightmare)                   | Scare zone                 | Licensed — The Purge Franchise (2013-2014) | Hollywood | Metro Lot           |

#### 2016 — [Halloween Horror Nights 2016 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2016_(Hollywood)>)

| Attraction                                                                                                                                                       | Type                       | IP                                                           | Parks     | Venue               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ | --------- | ------------------- |
| [American Horror Story](<https://halloweenhorrornights.fandom.com/wiki/American_Horror_Story_(Hollywood)>) _(Hollywood version)_                                 | House                      | **unclassified**                                             | Hollywood | FDTD Area           |
| [The Exorcist](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist_(Hollywood)>) _(Hollywood version)_                                                   | House                      | Licensed — The Exorcist (1973)                               | Hollywood | Mummy Venue         |
| [Freddy vs. Jason](<https://halloweenhorrornights.fandom.com/wiki/Freddy_vs._Jason_(Hollywood)>)                                                                 | House                      | Licensed — Friday the 13th Franchise (1980-2009)             | Hollywood | 747 Tent            |
| [Halloween: Hell Comes to Haddonfield](<https://halloweenhorrornights.fandom.com/wiki/Halloween%3A_Hell_Comes_to_Haddonfield_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — Halloween II (1981)                               | Hollywood | Jurassic Park Queue |
| [Krampus](<https://halloweenhorrornights.fandom.com/wiki/Krampus_(Hollywood)>) _(Hollywood version)_                                                             | House                      | Licensed — Krampus (2015)                                    | Hollywood | Metro Sets Tent     |
| [The Texas Chainsaw Massacre: Blood Brothers](https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre%3A_Blood_Brothers)                       | House                      | Licensed — The Texas Chainsaw Massacre Franchise (1974-2013) | Hollywood | Waterworld Queue    |
| [The Walking Dead Attraction](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead_Attraction)                                                         | House                      | Licensed — The Walking Dead (2010-2021)                      | Hollywood | UBE Venue           |
| [Eli Roth Presents: Terror Tram](https://halloweenhorrornights.fandom.com/wiki/Eli_Roth_Presents%3A_Terror_Tram)                                                 | Scare zone _(Terror Tram)_ | Original                                                     | Hollywood | Backlot             |
| [The Purge: Election Year](https://halloweenhorrornights.fandom.com/wiki/The_Purge%3A_Election_Year)                                                             | Scare zone                 | Licensed — The Purge Franchise (2013-2016)                   | Hollywood | Park-Wide           |

#### 2017 — [Halloween Horror Nights 2017 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2017_(Hollywood)>)

| Attraction                                                                                                                                  | Type                       | IP                                                       | Parks     | Venue               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------- | --------- | ------------------- |
| [American Horror Story: Roanoke](https://halloweenhorrornights.fandom.com/wiki/American_Horror_Story%3A_Roanoke)                            | House                      | Licensed — American Horror Story: Roanoke (2015)         | Hollywood | FDTD Area           |
| [The Shining](<https://halloweenhorrornights.fandom.com/wiki/The_Shining_(Hollywood)>) _(Hollywood version)_                                | House                      | Licensed — The Shining (1980)                            | Hollywood | Mummy Venue         |
| [Ash Vs. Evil Dead](<https://halloweenhorrornights.fandom.com/wiki/Ash_Vs._Evil_Dead_(Hollywood)>) _(Hollywood version)_                    | House                      | Licensed — Ash vs. Evil Dead Seasons 1 and 2 (2015-2016) | Hollywood |                     |
| [Titans of Terror](https://halloweenhorrornights.fandom.com/wiki/Titans_of_Terror)                                                          | House                      | Licensed — Friday the 13th (1980-2001)                   | Hollywood | Waterworld Queue    |
| [SAW: The Games of Jigsaw](<https://halloweenhorrornights.fandom.com/wiki/SAW%3A_The_Games_of_Jigsaw_(Hollywood)>) _(Hollywood version)_    | House                      | Licensed — SAW (Franchise) (2004-2017)                   | Hollywood | 747 Tent            |
| [Insidious: Beyond the Further](https://halloweenhorrornights.fandom.com/wiki/Insidious%3A_Beyond_the_Further)                              | House                      | Licensed — Insidious Franchise (2010-2018)               | Hollywood | Jurassic Park Queue |
| [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Hollywood_2017)>) _(Hollywood version)_ | House                      | Licensed — Happy Death Day (2017)                        | Hollywood | Parisian Courtyard  |
| [The Walking Dead Attraction](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead_Attraction)                                    | House                      | Licensed — The Walking Dead (2010-2021)                  | Hollywood | UBE Venue           |
| [Titans of Terror Tram: Hosted by Chucky](https://halloweenhorrornights.fandom.com/wiki/Titans_of_Terror_Tram%3A_Hosted_by_Chucky)          | Scare zone _(Terror Tram)_ | Licensed — Friday the 13th Franchise (1980-2009)         | Hollywood | Backlot             |
| [Hell-O-Ween](https://halloweenhorrornights.fandom.com/wiki/Hell-O-Ween)                                                                    | Scare zone                 | Original                                                 | Hollywood | Front Gates         |
| [Toxic Tunnel](https://halloweenhorrornights.fandom.com/wiki/Toxic_Tunnel)                                                                  | Scare zone                 | Original                                                 | Hollywood | Metro Lot Tunnel    |
| [Urban Inferno](https://halloweenhorrornights.fandom.com/wiki/Urban_Inferno)                                                                | Scare zone                 | Original                                                 | Hollywood | Metro Lot           |

#### 2018 — [Halloween Horror Nights 2018 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2018_(Hollywood)>)

| Attraction                                                                                                                                                               | Type                       | IP                                                         | Parks     | Venue              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------- | --------- | ------------------ |
| [Stranger Things](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_(Hollywood_2018)>) _(Hollywood version)_                                                | House                      | Licensed — Stranger Things Season 1 (2016)                 | Hollywood | Soundstage 29      |
| [Trick 'r Treat](<https://halloweenhorrornights.fandom.com/wiki/Trick_'r_Treat_(Haunted_Maze_Hollywood)>) _(Hollywood version)_                                          | House                      | Licensed — Trick 'r Treat (2007)                           | Hollywood | Mummy Venue        |
| [The First Purge](https://halloweenhorrornights.fandom.com/wiki/The_First_Purge)                                                                                         | House                      | Licensed — The First Purge (2018)                          | Hollywood | Metro Sets Tent    |
| [The Walking Dead Attraction](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead_Attraction)                                                                 | House                      | Licensed — The Walking Dead (2010-2021)                    | Hollywood | UBE Venue          |
| [Poltergeist](<https://halloweenhorrornights.fandom.com/wiki/Poltergeist_(Hollywood)>) _(Hollywood version)_                                                             | House                      | Licensed — Poltergeist (1982)                              | Hollywood | 747 Tent           |
| [Halloween 4: The Return of Michael Myers](<https://halloweenhorrornights.fandom.com/wiki/Halloween_4%3A_The_Return_of_Michael_Myers_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — Halloween 4: The Return of Michael Myers (1988) | Hollywood | Waterworld Queue   |
| [The Horrors of Blumhouse: Chapter Two](https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse%3A_Chapter_Two)                                           | House                      | Licensed — Unfriended (2015)                               | Hollywood | FDTD Area          |
| [Universal Monsters: Music by Slash](https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Music_by_Slash)                                                 | House                      | Licensed — Universal Classic Monsters                      | Hollywood | Parisian Courtyard |
| [Hollywood Harry's: Dreadtime Storyz](https://halloweenhorrornights.fandom.com/wiki/Hollywood_Harry's%3A_Dreadtime_Storyz)                                               | Scare zone _(Terror Tram)_ | Original                                                   | Hollywood | Backlot            |
| [Holidayz in Hell](<https://halloweenhorrornights.fandom.com/wiki/Holidayz_in_Hell_(Scarezone)>)                                                                         | Scare zone                 | Original                                                   | Hollywood | Metro Lot          |
| [Trick 'r Treat](<https://halloweenhorrornights.fandom.com/wiki/Trick_'r_Treat_(Scarezone_Hollywood)>) _(Hollywood version)_                                             | Scare zone                 | Licensed — Trick 'r Treat (2007)                           | Hollywood | New York Street    |
| [Monster Masquerade](https://halloweenhorrornights.fandom.com/wiki/Monster_Masquerade)                                                                                   | Scare zone                 | Original                                                   | Hollywood | French Street      |
| [Hell's Harvest](https://halloweenhorrornights.fandom.com/wiki/Hell's_Harvest)                                                                                           | Scare zone                 | Original                                                   | Hollywood | Front Gate         |
| [Toxxic Tunnel](https://halloweenhorrornights.fandom.com/wiki/Toxxic_Tunnel)                                                                                             | Scare zone                 | Original                                                   | Hollywood | Metro Lot Tunnel   |

#### 2019 — [Halloween Horror Nights 2019 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2019_(Hollywood)>)

| Attraction                                                                                                                                                 | Type       | IP                                               | Parks     | Venue              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ | --------- | ------------------ |
| [Stranger Things](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_(Hollywood_2019)>) _(Hollywood version)_                                  | House      | Licensed — Stranger Things 2 (2017)              | Hollywood | Soundstage 29      |
| [Holidayz in Hell](<https://halloweenhorrornights.fandom.com/wiki/Holidayz_in_Hell_(Haunted_Maze)>)                                                        | House      | Original                                         | Hollywood | Parisian Courtyard |
| [Universal Monsters: Frankenstein Meets The Wolf Man](https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Frankenstein_Meets_The_Wolf_Man) | House      | Licensed — Universal Classic Monsters            | Hollywood | Metro Sets Tent    |
| [The Walking Dead Attraction](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead_Attraction)                                                   | House      | Licensed — The Walking Dead (2010-2021)          | Hollywood | UBE Venue          |
| [Ghostbusters](<https://halloweenhorrornights.fandom.com/wiki/Ghostbusters_(Hollywood)>) _(Hollywood version)_                                             | House      | Licensed — Ghostbusters (1984)                   | Hollywood | 747 Tent           |
| [Killer Klowns From Outer Space](<https://halloweenhorrornights.fandom.com/wiki/Killer_Klowns_From_Outer_Space_(Hollywood)>) _(Hollywood version)_         | House      | Licensed — Killer Klowns From Outer Space (1988) | Hollywood | Mummy Venue        |
| [Creepshow](<https://halloweenhorrornights.fandom.com/wiki/Creepshow_(Haunted_House)>)                                                                     | House      | **unclassified**                                 | Hollywood | FDTD Area          |
| [Us](<https://halloweenhorrornights.fandom.com/wiki/Us_(Hollywood)>) _(Hollywood version)_                                                                 | House      | **unclassified**                                 | Hollywood | Tram Garage Tent 1 |
| [House of 1000 Corpses](<https://halloweenhorrornights.fandom.com/wiki/House_of_1000_Corpses_(Haunted_Maze_Hollywood)>) _(Hollywood version)_              | House      | Licensed — House of 1000 Corpses (2003)          | Hollywood | Waterworld Queue   |
| [The Curse of Pandora's Box](https://halloweenhorrornights.fandom.com/wiki/The_Curse_of_Pandora's_Box)                                                     | House      | Original                                         | Hollywood | Tram Garage Tent 2 |
| [Fallen Angelz](https://halloweenhorrornights.fandom.com/wiki/Fallen_Angelz)                                                                               | Scare zone | Original                                         | Hollywood | Front Gate         |
| [Spirits & Demons of the East](https://halloweenhorrornights.fandom.com/wiki/Spirits_%26_Demons_of_the_East)                                               | Scare zone | Original                                         | Hollywood | New York Street    |
| [Christmas in Hell](https://halloweenhorrornights.fandom.com/wiki/Christmas_in_Hell)                                                                       | Scare zone | Original                                         | Hollywood | French Street      |
| [ToXXXic Tunnel](https://halloweenhorrornights.fandom.com/wiki/ToXXXic_Tunnel)                                                                             | Scare zone | Original                                         | Hollywood | Metro Lot Tunnel   |
| [All Hallow's Evil](https://halloweenhorrornights.fandom.com/wiki/All_Hallow's_Evil)                                                                       | Scare zone | Original                                         | Hollywood | Metro Lot          |

#### 2021 — [Halloween Horror Nights 2021 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2021_(Hollywood)>)

| Attraction                                                                                                                                                                                     | Type                       | IP                                                         | Parks     | Venue              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- | --------- | ------------------ |
| [The Haunting of Hill House](<https://halloweenhorrornights.fandom.com/wiki/The_Haunting_of_Hill_House_(Haunted_Maze_Hollywood)>)                                                              | House                      | Licensed — The Haunting of Hill House (2018)               | Hollywood | H-Lot North        |
| [Universal Monsters: The Bride of Frankenstein Lives](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_The_Bride_of_Frankenstein_Lives_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — Universal Classic Monsters                      | Hollywood | Parisian Courtyard |
| [The Texas Chainsaw Massacre](<https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre_(Hollywood)>) _(Hollywood version)_                                                   | House                      | Licensed — The Texas Chainsaw Massacre (1974)              | Hollywood | Mummy Venue        |
| [The Exorcist](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist_(Hollywood)>)                                                                                                       | House                      | Licensed — The Exorcist (1973)                             | Hollywood | Soundstage 29      |
| [The Curse of Pandora's Box](https://halloweenhorrornights.fandom.com/wiki/The_Curse_of_Pandora's_Box)                                                                                         | House                      | Original                                                   | Hollywood | H-Lot South        |
| [Halloween 4: The Return of Michael Myers](<https://halloweenhorrornights.fandom.com/wiki/Halloween_4%3A_The_Return_of_Michael_Myers_(Hollywood)>)                                             | House                      | Licensed — Halloween 4: The Return of Michael Myers (1988) | Hollywood | Waterworld Queue   |
| [The Walking Dead Attraction](https://halloweenhorrornights.fandom.com/wiki/The_Walking_Dead_Attraction)                                                                                       | House                      | Licensed — The Walking Dead (2010-2021)                    | Hollywood | UBE Venue          |
| [Terror Tram: The Ultimate Purge](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_The_Ultimate_Purge)                                                                             | Scare zone _(Terror Tram)_ | Licensed — The Purge series                                | Hollywood | Backlot            |
| [Universal Monsters: Silver Scream Queenz](https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Silver_Scream_Queenz)                                                           | Scare zone                 | Licensed — Universal Classic Mosnters                      | Hollywood | French Street      |
| [Chainsaw Rangers](https://halloweenhorrornights.fandom.com/wiki/Chainsaw_Rangers)                                                                                                             | Scare zone                 | Original                                                   | Hollywood | Front Gates        |
| [Demon City](https://halloweenhorrornights.fandom.com/wiki/Demon_City)                                                                                                                         | Scare zone                 | Original                                                   | Hollywood | New York Street    |

#### 2022 — [Halloween Horror Nights 2022 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2022_(Hollywood)>)

| Attraction                                                                                                                                                     | Type                       | IP                                               | Parks     | Venue               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ | --------- | ------------------- |
| [Universal Monsters: Legends Collide](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Legends_Collide_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — Universal Classic Monsters            | Hollywood | Mummy Venue         |
| [Halloween](<https://halloweenhorrornights.fandom.com/wiki/Halloween_(Hollywood_2022)>) _(Hollywood version)_                                                  | House                      | Licensed — Halloween (1978)                      | Hollywood | H-Lot South         |
| [The Horrors of Blumhouse](<https://halloweenhorrornights.fandom.com/wiki/The_Horrors_of_Blumhouse_(Hollywood_2022)>) _(Hollywood version)_                    | House                      | Licensed — Freaky (2020)                         | Hollywood | Waterworld Queue    |
| [The Weeknd: After Hours Nightmare](<https://halloweenhorrornights.fandom.com/wiki/The_Weeknd%3A_After_Hours_Nightmare_(Hollywood)>) _(Hollywood version)_     | House                      | Licensed — After Hours (2020)                    | Hollywood | Soundstage 29       |
| [Scarecrow: The Reaping](<https://halloweenhorrornights.fandom.com/wiki/Scarecrow%3A_The_Reaping_(Hollywood)>)                                                 | House                      | Original                                         | Hollywood | H-Lot North         |
| [La Llorona: The Weeping Woman](https://halloweenhorrornights.fandom.com/wiki/La_Llorona%3A_The_Weeping_Woman)                                                 | House                      | Licensed — The Urban Legend of La Llorona        | Hollywood | Parisian Courtyard  |
| [Universal Horror Hotel](https://halloweenhorrornights.fandom.com/wiki/Universal_Horror_Hotel)                                                                 | House                      | Original                                         | Hollywood | UBE Venue           |
| [Killer Klowns From Outer Space](<https://halloweenhorrornights.fandom.com/wiki/Killer_Klowns_From_Outer_Space_(Hollywood)>)                                   | House                      | Licensed — Killer Klowns From Outer Space (1988) | Hollywood | T-Pad               |
| [Terror Tram](<https://halloweenhorrornights.fandom.com/wiki/Terror_Tram_(2022)>)                                                                              | Scare zone _(Terror Tram)_ | Licensed — Us (2019)                             | Hollywood | Studio Tour Backlot |
| [El Pueblo Del Terror](https://halloweenhorrornights.fandom.com/wiki/El_Pueblo_Del_Terror)                                                                     | Scare zone                 | Original                                         | Hollywood | French Street       |
| [Sideshow Slaughterhouse](https://halloweenhorrornights.fandom.com/wiki/Sideshow_Slaughterhouse)                                                               | Scare zone                 | Original                                         | Hollywood | New York Street     |
| [Clownsawz](https://halloweenhorrornights.fandom.com/wiki/Clownsawz)                                                                                           | Scare zone                 | Original                                         | Hollywood | Front Gate          |

#### 2023 — [Halloween Horror Nights 32](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_32)

| Attraction                                                                                                                                         | Type                       | IP                                                            | Parks               | Venue                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- | ------------------- | ------------------------------------------------ |
| [The Exorcist: Believer](<https://halloweenhorrornights.fandom.com/wiki/The_Exorcist%3A_Believer_(Orlando)>)                                       | House                      | Licensed — The Exorcist: Believer (2023)                      | Hollywood + Orlando | Orlando: Soundstage 22; Hollywood: Soundstage 22 |
| [Chucky: Ultimate Kill Count](<https://halloweenhorrornights.fandom.com/wiki/Chucky%3A_Ultimate_Kill_Count_(Hollywood)>) _(Hollywood version)_     | House                      | Licensed — Child's Play (Franchise)/Original/Chucky TV Series | Hollywood           | H-Lot North                                      |
| [The Last of Us](<https://halloweenhorrornights.fandom.com/wiki/The_Last_of_Us_(Hollywood)>) _(Hollywood version)_                                 | House                      | Licensed — The Last of Us (2013 Video Game)                   | Hollywood           | Mummy Venue                                      |
| [Stranger Things 4](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_4_(Hollywood)>) _(Hollywood version)_                           | House                      | Licensed — Stranger Things (TV Show)                          | Hollywood           | Soundstage 15                                    |
| [Universal Monsters: Unmasked](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Unmasked_(Hollywood)>) _(Hollywood version)_   | House                      | Licensed — Universal Classic Monsters                         | Hollywood           | H-Lot South                                      |
| [Monstruos: The Monsters of Latin America](<https://halloweenhorrornights.fandom.com/wiki/Monstruos%3A_The_Monsters_of_Latin_America_(Hollywood)>) | House                      | Licensed — Latin American Urban Legends                       | Hollywood           | Parisian Courtyard                               |
| [Evil Dead Rise](https://halloweenhorrornights.fandom.com/wiki/Evil_Dead_Rise)                                                                     | House                      | Licensed — Evil Dead Rise (2023)                              | Hollywood           | UBE Venue                                        |
| [Holidayz in Hell](<https://halloweenhorrornights.fandom.com/wiki/Holidayz_in_Hell_(Haunted_Maze)>)                                                | House                      | Original                                                      | Hollywood           | T-Pad                                            |
| [Terror Tram: The Exterminatorz](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_The_Exterminatorz)                                   | Scare zone _(Terror Tram)_ | Original                                                      | Hollywood           | Studio Tour Backlot                              |
| [Ghostz](https://halloweenhorrornights.fandom.com/wiki/Ghostz)                                                                                     | Scare zone                 | Original                                                      | Hollywood           | Front Gates                                      |
| [Toyz](https://halloweenhorrornights.fandom.com/wiki/Toyz)                                                                                         | Scare zone                 | Original                                                      | Hollywood           | New York Street                                  |
| [El Terror de las Momias](https://halloweenhorrornights.fandom.com/wiki/El_Terror_de_las_Momias)                                                   | Scare zone                 | Original                                                      | Hollywood           | French Street                                    |

#### 2024 — [Halloween Horror Nights 2024 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2024_(Hollywood)>)

| Attraction                                                                                                                                                           | Type                       | IP                                                                    | Parks     | Venue               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- | --------- | ------------------- |
| [A Quiet Place](<https://halloweenhorrornights.fandom.com/wiki/A_Quiet_Place_(Hollywood_2024)>) _(Hollywood version)_                                                | House                      | Licensed — A Quiet Place Franchise (2018-2020)                        | Hollywood | UBE Venue           |
| [Dead Exposure: Death Valley](https://halloweenhorrornights.fandom.com/wiki/Dead_Exposure%3A_Death_Valley)                                                           | House                      | Original                                                              | Hollywood | Mummy Venue         |
| [Monstruos 2: The Nightmares of Latin America](https://halloweenhorrornights.fandom.com/wiki/Monstruos_2%3A_The_Nightmares_of_Latin_America)                         | House                      | Original                                                              | Hollywood | Parisian Courtyard  |
| [Ghostbusters: Frozen Empire](<https://halloweenhorrornights.fandom.com/wiki/Ghostbusters%3A_Frozen_Empire_(Hollywood)>) _(Hollywood version)_                       | House                      | Licensed — Ghostbusters: Frozen Empire (2024)                         | Hollywood | H-Lot North         |
| [Insidious: The Further](<https://halloweenhorrornights.fandom.com/wiki/Insidious%3A_The_Further_(Hollywood)>) _(Hollywood version)_                                 | House                      | Licensed — Insidious (2010-2023)                                      | Hollywood | H-Lot South         |
| [Universal Monsters: Eternal Bloodlines](<https://halloweenhorrornights.fandom.com/wiki/Universal_Monsters%3A_Eternal_Bloodlines_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — Universal Classic Monsters                                 | Hollywood | Soundstage 12       |
| [The Texas Chainsaw Massacre: The Legacy of Leatherface](https://halloweenhorrornights.fandom.com/wiki/The_Texas_Chainsaw_Massacre%3A_The_Legacy_of_Leatherface)     | House                      | Licensed — The Texas Chainsaw Massacre (Franchise)/Original           | Hollywood | T-Pad               |
| [The Weeknd: Nightmare Trilogy](https://halloweenhorrornights.fandom.com/wiki/The_Weeknd%3A_Nightmare_Trilogy)                                                       | House                      | Licensed — After Hours (2020)/Dawn FM (2022)/Hurry Up Tomorrow (2025) | Hollywood | Soundstage 15       |
| [Terror Tram: Enter the Blumhouse](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Enter_the_Blumhouse)                                                 | Scare zone _(Terror Tram)_ | **unclassified**                                                      | Hollywood | Studio Tour Backlot |
| [Luchadores Monstruosos](https://halloweenhorrornights.fandom.com/wiki/Luchadores_Monstruosos)                                                                       | Scare zone                 | Original                                                              | Hollywood | French Street       |
| [Murder of Crowz](https://halloweenhorrornights.fandom.com/wiki/Murder_of_Crowz)                                                                                     | Scare zone                 | Original                                                              | Hollywood | Decision Hub        |
| [Chainsaw Punkz](https://halloweenhorrornights.fandom.com/wiki/Chainsaw_Punkz)                                                                                       | Scare zone                 | Original                                                              | Hollywood | Front Gates         |
| [Skull Lordz](https://halloweenhorrornights.fandom.com/wiki/Skull_Lordz)                                                                                             | Scare zone                 | Original                                                              | Hollywood | New York Street     |

#### 2025 — [Halloween Horror Nights 34](https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_34)

| Attraction                                                                                                                                                                       | Type                       | IP                                                          | Parks               | Venue                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------- | ------------------- | ------------------------------------------------- |
| [Five Nights at Freddy's](<https://halloweenhorrornights.fandom.com/wiki/Five_Nights_at_Freddy's_(Orlando)>)                                                                     | House                      | Licensed — Five Nights at Freddy's (2023)                   | Hollywood + Orlando | Orlando: Soundstage 23B; Hollywood: Soundstage 15 |
| [Fallout](<https://halloweenhorrornights.fandom.com/wiki/Fallout_(Hollywood)>) _(Hollywood version)_                                                                             | House                      | Licensed — Fallout (TV Series)/ Fallout (Video Game Series) | Hollywood           | UBE Venue                                         |
| [Monstruos 3: The Ghosts of Latin America](https://halloweenhorrornights.fandom.com/wiki/Monstruos_3%3A_The_Ghosts_of_Latin_America)                                             | House                      | Original                                                    | Hollywood           | Parisian Courtyard                                |
| [Jason Universe](<https://halloweenhorrornights.fandom.com/wiki/Jason_Universe_(Hollywood)>) _(Hollywood version)_                                                               | House                      | Licensed — Friday The 13th (Franchise)/Jason Universe       | Hollywood           | Mummy Venue                                       |
| [Scarecrow: Music by Slash](<https://halloweenhorrornights.fandom.com/wiki/Scarecrow%3A_The_Reaping_(Hollywood)>)                                                                | House                      | Original                                                    | Hollywood           | T-Pad                                             |
| [WWE Presents: The Horrors of The Wyatt Sicks](<https://halloweenhorrornights.fandom.com/wiki/WWE_Presents%3A_The_Horrors_of_The_Wyatt_Sicks_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — The Wyatt Sicks                                  | Hollywood           | Jurassic World Queue                              |
| [Terrifier](<https://halloweenhorrornights.fandom.com/wiki/Terrifier_(Hollywood)>) _(Hollywood version)_                                                                         | House                      | Licensed — Terrifier (Franchise)                            | Hollywood           | H-Lot North                                       |
| [Poltergeist](<https://halloweenhorrornights.fandom.com/wiki/Poltergeist_(Hollywood)>)                                                                                           | House                      | Licensed — Poltergeist (1982)                               | Hollywood           | H-Lot South                                       |
| [Terror Tram: Enter the Blumhouse](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram%3A_Enter_the_Blumhouse)                                                             | Scare zone _(Terror Tram)_ | **unclassified**                                            | Hollywood           | Studio Tour Backlot                               |
| [Carnival of Carnage](https://halloweenhorrornights.fandom.com/wiki/Carnival_of_Carnage)                                                                                         | Scare zone                 | Original                                                    | Hollywood           | New York Street                                   |
| [Noche de Brujas](https://halloweenhorrornights.fandom.com/wiki/Noche_de_Brujas)                                                                                                 | Scare zone                 | Original                                                    | Hollywood           | French Street                                     |
| [Chainsaw Clownz](https://halloweenhorrornights.fandom.com/wiki/Chainsaw_Clownz)                                                                                                 | Scare zone                 | Original                                                    | Hollywood           | Front Gates                                       |
| [Murder of Crowz](https://halloweenhorrornights.fandom.com/wiki/Murder_of_Crowz)                                                                                                 | Scare zone                 | Original                                                    | Hollywood           | Decision Hub                                      |

#### 2026 — [Halloween Horror Nights 2026 (Hollywood)](<https://halloweenhorrornights.fandom.com/wiki/Halloween_Horror_Nights_2026_(Hollywood)>)

| Attraction                                                                                                                                                 | Type                       | IP                                               | Parks     | Venue                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ | --------- | -------------------- |
| [Sinners](<https://halloweenhorrornights.fandom.com/wiki/Sinners_(Hollywood)>) _(Hollywood version)_                                                       | House                      | Licensed — Sinners (2025)                        | Hollywood | UBE Venue            |
| [Killceañera: Music by Slash](https://halloweenhorrornights.fandom.com/wiki/Killcea%C3%B1era%3A_Music_by_Slash)                                            | House                      | Original                                         | Hollywood | Parisian Courtyard   |
| [Ozzy Osbourne: Prince of Darkness](<https://halloweenhorrornights.fandom.com/wiki/Ozzy_Osbourne%3A_Prince_of_Darkness_(Hollywood)>) _(Hollywood version)_ | House                      | Licensed — Ozzy Osbourne                         | Hollywood | Mummy Venue          |
| [Stranger Things 5](<https://halloweenhorrornights.fandom.com/wiki/Stranger_Things_5_(Hollywood)>) _(Hollywood version)_                                   | House                      | Licensed — Stranger Things 5 (2025)              | Hollywood | Soundstage 15        |
| [Killer Klowns from Outer-Space](<https://halloweenhorrornights.fandom.com/wiki/Killer_Klowns_From_Outer_Space_(Hollywood)>)                               | House                      | Licensed — Killer Klowns From Outer Space (1988) | Hollywood | T-Pad                |
| [Dead, Deader, Deadest](https://halloweenhorrornights.fandom.com/wiki/Dead%2C_Deader%2C_Deadest)                                                           | House                      | Original                                         | Hollywood | Jurassic World Queue |
| [Hellraiser](<https://halloweenhorrornights.fandom.com/wiki/Hellraiser_(Hollywood)>) _(Hollywood version)_                                                 | House                      | Licensed — Hellraiser (1987)                     | Hollywood | H-Lot North          |
| [Evil Dead Burn](<https://halloweenhorrornights.fandom.com/wiki/Evil_Dead_Burn_(Hollywood)>) _(Hollywood version)_                                         | House                      | Licensed — Evil Dead Burn (2026)                 | Hollywood | H-Lot South          |
| [Terror Tram starring Art the Clown](https://halloweenhorrornights.fandom.com/wiki/Terror_Tram_starring_Art_the_Clown)                                     | Scare zone _(Terror Tram)_ | Licensed — Terrifier 3/Original                  | Hollywood | Studio Tour Backlot  |
| [Fortnitemares](<https://halloweenhorrornights.fandom.com/wiki/Fortnitemares_(Hollywood)>) _(Hollywood version)_                                           | Scare zone                 | Licensed — Fortnite                              | Hollywood | New York Street      |
| [El Circo de la Muerte](https://halloweenhorrornights.fandom.com/wiki/El_Circo_de_la_Muerte)                                                               | Scare zone                 | Original                                         | Hollywood | French Street        |
| [Hackerz](https://halloweenhorrornights.fandom.com/wiki/Hackerz)                                                                                           | Scare zone                 | Original                                         | Hollywood | Front Gates          |
| [Blood Bog](https://halloweenhorrornights.fandom.com/wiki/Blood_Bog)                                                                                       | Scare zone                 | Original                                         | Hollywood | Studio Tour Backlot  |
| [Murder of Crowz](https://halloweenhorrornights.fandom.com/wiki/Murder_of_Crowz)                                                                           | Scare zone                 | Original                                         | Hollywood | Front Gates          |
| [Shriek of the Banshee](https://halloweenhorrornights.fandom.com/wiki/Shriek_of_the_Banshee)                                                               | Scare zone                 | Original                                         | Hollywood | Decision Hub         |

## What happens next

The per-attraction sourcing pass: confirming names and IP against Universal's
own material, resolving the 22 unclassified rows, and attaching per-attraction
YouTube walkthroughs — the eligibility research established that full-event
coverage exists for every year in scope.
