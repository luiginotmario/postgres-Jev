import { randomInt, randomUUID } from "node:crypto";
import type { DataRow, Dataset, DatasetKind, Judgment } from "../src/types.js";

const pick = <T>(values: readonly T[]): T => values[randomInt(values.length)];
const shuffle = <T>(values: readonly T[]): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

import { peopleProfiles, careerNotes } from "./people-profiles.js";
import { sensorScenarios } from "./sensor-scenarios.js";

const countryReference = [
  [
    "Portugal",
    "Europe",
    "Lisbon",
    "Portuguese",
    "Atlantic coast, mild winters and a Mediterranean climate.",
  ],
  [
    "Japan",
    "Asia",
    "Tokyo",
    "Japanese",
    "Pacific island nation with steep mountains. Coastal access does not mean year-round beach weather; conditions vary strongly by season and latitude.",
  ],
  [
    "Canada",
    "North America",
    "Ottawa",
    "English, French",
    "Atlantic and Pacific coasts, cold winters, forests and lakes. Plenty of coastline, but a poor match for someone who assumes an ocean holiday must be tropical.",
  ],
  [
    "Brazil",
    "South America",
    "Brasília",
    "Portuguese",
    "Atlantic coast, tropical rainforest and a warm climate.",
  ],
  [
    "Germany",
    "Europe",
    "Berlin",
    "German",
    "North Sea and Baltic coasts, temperate climate.",
  ],
  [
    "Switzerland",
    "Europe",
    "Bern",
    "German, French, Italian, Romansh",
    "Alpine mountains and lakes with cold winters. Lakeside swimming is possible, but this landlocked country has no sea coast.",
  ],
  [
    "Kenya",
    "Africa",
    "Nairobi",
    "Swahili, English",
    "Indian Ocean coast, savannas and a tropical climate.",
  ],
  [
    "Australia",
    "Oceania",
    "Canberra",
    "English",
    "Extensive coastlines, a dry interior and major regional climate differences. Tropical northern areas contrast with temperate southern cities; a single national climate label is misleading.",
  ],
  [
    "Iceland",
    "Europe",
    "Reykjavík",
    "Icelandic",
    "North Atlantic island with volcanoes, glaciers and geothermal pools. Outdoor hot-water bathing is possible despite the cold climate; that is different from tropical beach weather.",
  ],
  [
    "Mexico",
    "North America",
    "Mexico City",
    "Spanish",
    "Pacific and Gulf coasts, deserts and tropical regions.",
  ],
  [
    "Argentina",
    "South America",
    "Buenos Aires",
    "Spanish",
    "Atlantic coast, Andes mountains and temperate plains.",
  ],
  [
    "Nepal",
    "Asia",
    "Kathmandu",
    "Nepali",
    "Landlocked, Himalayan mountains and an alpine climate.",
  ],
  [
    "New Zealand",
    "Oceania",
    "Wellington",
    "English, Māori",
    "Pacific island nation with mountains and a temperate climate.",
  ],
  [
    "Morocco",
    "Africa",
    "Rabat",
    "Arabic, Amazigh",
    "Atlantic and Mediterranean coasts, mountains and desert.",
  ],
  [
    "Norway",
    "Europe",
    "Oslo",
    "Norwegian",
    "North Atlantic coast, deep fjords and mountains, with cold winters. Well suited to dramatic coastal scenery, but ocean access alone does not make it a warm beach destination.",
  ],
  [
    "Thailand",
    "Asia",
    "Bangkok",
    "Thai",
    "Tropical climate, beaches and coast on two seas.",
  ],
  [
    "Chile",
    "South America",
    "Santiago",
    "Spanish",
    "A long Pacific coastline beside the Andes. The dry northern desert and the cold southern fjords offer very different trips; coastal does not necessarily mean warm water.",
  ],
  [
    "Italy",
    "Europe",
    "Rome",
    "Italian",
    "Mediterranean coast, mild winters in the south, alpine north.",
  ],
  [
    "Mongolia",
    "Asia",
    "Ulaanbaatar",
    "Mongolian",
    "Landlocked, grassland and desert, very cold winters.",
  ],
  [
    "France",
    "Europe",
    "Paris",
    "French",
    "Atlantic and Mediterranean coasts, varied temperate climate.",
  ],
  [
    "Greece",
    "Europe",
    "Athens",
    "Greek",
    "Mediterranean coast and islands, warm dry summers.",
  ],
  [
    "Finland",
    "Europe",
    "Helsinki",
    "Finnish, Swedish",
    "Baltic coast, many lakes, forests and cold winters.",
  ],
  [
    "Peru",
    "South America",
    "Lima",
    "Spanish, Quechua, Aymara",
    "Pacific coast, high Andes and Amazon rainforest. The coastal desert can be cool and foggy while the eastern lowlands are tropical; the climate depends on the region.",
  ],
  [
    "Austria",
    "Europe",
    "Vienna",
    "German",
    "Landlocked, alpine mountains and temperate valleys.",
  ],
] as const;

function generatePeople(): DataRow[] {
  const firstNames = [
    "Alex",
    "Sofia",
    "James",
    "Maya",
    "Oliver",
    "Amara",
    "Noah",
    "Luca",
    "Emma",
    "Ethan",
    "Isabel",
    "Leo",
    "Chloe",
    "Ava",
    "Ben",
    "Milo",
    "Nina",
    "Oscar",
    "Zoe",
    "Theo",
  ];
  const lastNames = [
    "Morgan",
    "Chen",
    "Bennett",
    "Patel",
    "Williams",
    "Okafor",
    "Rivera",
    "Rossi",
    "Anderson",
    "Park",
  ];
  const names = shuffle(
    firstNames.flatMap((first) => lastNames.map((last) => `${first} ${last}`)),
  );
  const profiles = shuffle(peopleProfiles);
  return names.slice(0, randomInt(96, 130)).map((name, index) => {
    const [job_title, work_mode, skills, context] =
      profiles[index % profiles.length];
    const description =
      context +
      " " +
      careerNotes[
        (Math.floor(index / profiles.length) + index) % careerNotes.length
      ];
    return {
      id: index + 1,
      name,
      job_title,
      work_mode,
      skills,
      description,
    };
  });
}

function generateCountries(): DataRow[] {
  return shuffle(countryReference)
    .slice(0, randomInt(18, 25))
    .map(([country, continent, capital, languages, description], index) => ({
      id: index + 1,
      country,
      continent,
      capital,
      languages,
      description,
    }));
}

function generateNumbers(): DataRow[] {
  const scenarios = shuffle(sensorScenarios);
  return Array.from({ length: randomInt(54, 91) }, (_, index) => {
    const [location, temperature_c, humidity_pct, battery_pct, status, notes] =
      scenarios[index % scenarios.length];
    return {
      id: index + 1,
      sensor: "SEN-" + String(index + 1).padStart(3, "0"),
      location:
        location +
        " · " +
        ["North", "South", "East", "West", "Central"][
          Math.floor(index / scenarios.length)
        ],
      temperature_c,
      humidity_pct,
      battery_pct,
      status,
      notes,
    };
  });
}
const definitions = {
  people: {
    title: "People",
    columns: [
      ["name", "Name"],
      ["job_title", "Job title"],
      ["work_mode", "Work mode"],
      ["skills", "Skills"],
      ["description", "Background & constraints"],
    ],
    examples: [
      "Could work from home",
      "People who know SQL",
      "People with startup experience",
    ],
    generate: generatePeople,
  },
  countries: {
    title: "Countries",
    columns: [
      ["country", "Country"],
      ["continent", "Continent"],
      ["capital", "Capital"],
      ["languages", "Languages"],
      ["description", "Description"],
    ],
    examples: [
      "Warm places with a coastline",
      "Landlocked countries",
      "Places where people speak Spanish",
    ],
    generate: generateCountries,
  },
  numbers: {
    title: "Sensor readings",
    columns: [
      ["sensor", "Sensor"],
      ["location", "Location"],
      ["temperature_c", "Temperature"],
      ["humidity_pct", "Humidity"],
      ["battery_pct", "Battery"],
      ["status", "Status"],
      ["notes", "Operating context"],
    ],
    examples: [
      "Sensors that might need attention",
      "Low battery and high temperature",
      "Offline sensors",
    ],
    generate: generateNumbers,
  },
} satisfies Record<
  DatasetKind,
  {
    title: string;
    columns: string[][];
    examples: string[];
    generate: () => DataRow[];
  }
>;

const semanticExamples: Record<DatasetKind, string[]> = {
  people: [
    "Could explain a technical product to a customer who is not technical",
    "Can work entirely from home, even if their job title suggests otherwise",
    "Have actually queried databases, not just recruited people who do",
    "Have operated in an early-stage company without a playbook",
    "Could help a confused customer and also investigate the technical cause",
    "Can coach people but do not want to manage a team",
  ],
  countries: [
    "Places with both mountains and access to the sea",
    "Somewhere for a beach trip rather than a cold-weather holiday",
    "Countries where a Spanish speaker could communicate and also visit mountains",
  ],
  numbers: [
    "Needs intervention, excluding planned tests and issues already resolved",
    "Looks alarming from the numbers but is actually expected in context",
    "Could lose monitoring soon unless someone visits the site",
    "Temperature is unsafe for what is stored there, even if it feels cold",
  ],
};

export function generateDataset(kind: DatasetKind, live = false): Dataset {
  const definition = definitions[kind];
  return {
    kind,
    title: definition.title,
    columns: definition.columns.map(([key, label]) => ({ key, label })),
    examples: live ? semanticExamples[kind] : definition.examples,
    rows: definition.generate(),
    version: randomUUID(),
    live,
  };
}

export function nextDataset(current: DatasetKind, live = false): Dataset {
  const kinds: DatasetKind[] = ["people", "countries", "numbers"];
  return generateDataset(pick(kinds.filter((kind) => kind !== current)), live);
}

type Predicate = (row: DataRow) => boolean;
const demoRules: Record<DatasetKind, Record<string, Predicate>> = {
  people: {
    "could work from home": (row) => row.work_mode !== "On-site",
    "people who know sql": (row) => /sql/i.test(String(row.skills)),
    "people with startup experience": (row) =>
      /startup/i.test(String(row.description)),
  },
  countries: {
    "warm places with a coastline": (row) =>
      /coast/i.test(String(row.description)) &&
      /warm|tropical|mild winters|mediterranean/i.test(String(row.description)),
    "landlocked countries": (row) =>
      /landlocked/i.test(String(row.description)),
    "places where people speak spanish": (row) =>
      /spanish/i.test(String(row.languages)),
  },
  numbers: {
    "sensors that might need attention": (row) =>
      Number(row.battery_pct) < 20 ||
      Number(row.temperature_c) > 40 ||
      row.status !== "Online",
    "low battery and high temperature": (row) =>
      Number(row.battery_pct) < 30 && Number(row.temperature_c) > 30,
    "offline sensors": (row) => row.status === "Offline",
  },
};

export function scoreDemo(dataset: Dataset, query: string): Judgment[] {
  const rule =
    demoRules[dataset.kind][
      query
        .trim()
        .toLowerCase()
        .replace(/[?.!]+$/, "")
    ];
  if (!rule)
    throw new Error(
      `Live search needs a server API key. In demo mode, try “${dataset.examples[0]}”.`,
    );
  return dataset.rows.map((row) => ({
    row,
    probability: rule(row) ? 0.96 : 0.04,
  }));
}
