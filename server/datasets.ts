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

const roles = [
  [
    "Product designer",
    "Remote",
    "Figma, prototypes, design systems",
    "Designs digital products with a distributed team.",
  ],
  [
    "Software engineer",
    "Remote",
    "TypeScript, React, SQL",
    "Builds developer tools. Previously worked at a startup.",
  ],
  [
    "Architect",
    "On-site",
    "AutoCAD, sustainable design",
    "Designs buildings and visits construction sites.",
  ],
  [
    "Content strategist",
    "Remote",
    "Writing, SEO, storytelling",
    "Turns technical ideas into stories across time zones.",
  ],
  [
    "Registered nurse",
    "On-site",
    "Patient care, clinical practice",
    "Provides hands-on care at a community hospital.",
  ],
  [
    "Data analyst",
    "Hybrid",
    "SQL, Python, statistics",
    "Finds patterns in data for climate technology teams.",
  ],
  [
    "Head chef",
    "On-site",
    "Cooking, team leadership",
    "Runs a neighborhood restaurant using seasonal ingredients.",
  ],
  [
    "Illustrator",
    "Remote",
    "Illustration, visual storytelling",
    "Creates editorial illustrations from a home studio.",
  ],
  [
    "Product manager",
    "Hybrid",
    "Research, B2B SaaS, roadmaps",
    "Leads a software team. Former startup founder.",
  ],
] as const;

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
    "Pacific island nation with mountains and a temperate climate.",
  ],
  [
    "Canada",
    "North America",
    "Ottawa",
    "English, French",
    "Atlantic and Pacific coasts, cold winters, forests and lakes.",
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
    "Landlocked, alpine mountains and cold winters.",
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
    "Extensive coastlines and a desert interior.",
  ],
  [
    "Iceland",
    "Europe",
    "Reykjavík",
    "Icelandic",
    "North Atlantic island, cold climate and volcanoes.",
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
    "North Atlantic coast, fjords and cold winters.",
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
    "Long Pacific coast, Andes mountains and desert.",
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
    "Pacific coast, Andes mountains and Amazon rainforest.",
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
  return names.slice(0, randomInt(80, 130)).map((name, index) => {
    const [job_title, work_mode, skills, description] = pick(roles);
    return {
      id: index + 1,
      name,
      job_title,
      country: pick(countryReference)[0],
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
  return Array.from({ length: randomInt(50, 101) }, (_, index) => ({
    id: index + 1,
    sensor: `SEN-${String(index + 1).padStart(3, "0")}`,
    location: pick([
      "Greenhouse",
      "Server room",
      "Cold storage",
      "Workshop",
      "Office",
      "Warehouse",
    ]),
    temperature_c: randomInt(-15, 56),
    humidity_pct: randomInt(10, 96),
    battery_pct: randomInt(1, 101),
    status: pick(["Online", "Online", "Online", "Offline", "Maintenance"]),
  }));
}

const definitions = {
  people: {
    title: "People",
    columns: [
      ["name", "Name"],
      ["job_title", "Job title"],
      ["country", "Country"],
      ["work_mode", "Work mode"],
      ["description", "Description"],
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

export function generateDataset(kind: DatasetKind, live = false): Dataset {
  const definition = definitions[kind];
  return {
    kind,
    title: definition.title,
    columns: definition.columns.map(([key, label]) => ({ key, label })),
    examples: definition.examples,
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
