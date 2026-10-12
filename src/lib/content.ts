export type Day = { id: string; label: string; date: string; headliners: string[]; acts: string[] };

export const LINEUP: Day[] = [
  {
    id: "fri",
    label: "Fri",
    date: "Friday 21 August",
    headliners: ["Velvet Static", "Mira Kova"],
    acts: [
      "Hollow Cartography",
      "Tessellate",
      "DJ Paperweight",
      "Saint Lumen",
      "Orchid Engine",
      "Low Tide Choir",
      "Kasimir & The Night Bus",
      "Reverb Unit 9",
      "Fen",
      "Glass Harbour",
      "Nadia Oruç",
      "Brightline",
      "Moss Theory",
      "Tandem Ghost",
      "Lake Static",
      "Anouk V",
      "Kilns",
      "Pale Signal",
    ],
  },
  {
    id: "sat",
    label: "Sat",
    date: "Saturday 22 August",
    headliners: ["The Quarry Lights", "Ozu Ozu"],
    acts: [
      "Sable & Ash",
      "Moonfeeder",
      "Cartwheel Sound System",
      "Juno Halvard",
      "Oak & Ion",
      "Night Index",
      "Sundial Kids",
      "Petra Weiss",
      "Marrow",
      "Telefon Lake",
      "Ilse",
      "Hum Collective",
      "Rosa Nightjar",
      "Copper Fields",
      "Breakwater",
      "Lumen Twins",
      "Nova Brandt",
      "Wren",
    ],
  },
  {
    id: "sun",
    label: "Sun",
    date: "Sunday 23 August",
    headliners: ["Ana Silvermoon", "Tidal Archive"],
    acts: [
      "Second Sun",
      "Hearth",
      "Halcyon Drive",
      "Ferro",
      "Little Cascade",
      "Pilar Montes",
      "Echo Chamber Orchestra",
      "Slow Bloom",
      "Kite Theory",
      "Morning Static",
      "Dune Choir",
      "Ottoline",
      "Field Notes",
      "Quiet Riot Club",
      "Ember Lane",
      "Yuki Sorrel",
      "Coastline",
      "Halo Rider",
    ],
  },
];

export const STAGES = [
  {
    name: "The Bowl",
    accent: "acid",
    hours: "18:00 – 03:00",
    text: "The quarry floor. A 360° rig pointed straight up the walls, so the echo becomes part of the mix. Headliners after dark.",
  },
  {
    name: "Terrace",
    accent: "coral",
    hours: "14:00 – 00:00",
    text: "Cut into the second ledge with a view over the whole valley. Live bands, sunset sets and a very long bar.",
  },
  {
    name: "The Shaft",
    accent: "cyan",
    hours: "22:00 – sunrise",
    text: "An old drainage tunnel, 120 metres of concrete and a sound system that will rearrange your ribs. Open 22:00 till sunrise.",
  },
  {
    name: "Moss Room",
    accent: "haze",
    hours: "11:00 – 23:00",
    text: "A quiet tent in the pines. Ambient, listening sessions, sound baths and the best coffee on site.",
  },
] as const;

export const TICKETS = [
  {
    name: "Weekend",
    price: 189,
    tagline: "All three nights, all four stages.",
    includes: ["Fri–Sun entry", "Free shuttle from Halvard station", "Refillable cup"],
    featured: false,
  },
  {
    name: "Weekend + Camping",
    price: 239,
    tagline: "Wake up in the pines.",
    includes: ["Everything in Weekend", "Pitch in the Pine Field", "Hot showers, charging tent"],
    featured: true,
  },
  {
    name: "Day ticket",
    price: 79,
    tagline: "Pick one night.",
    includes: ["Entry on one day", "All four stages", "Re-entry until 23:00"],
    featured: false,
  },
];

export const TRIP = [
  {
    title: "Getting there",
    text: "Trains run to Halvard station every 30 minutes. Our electric shuttle loops from the station to the gate from 12:00 till 04:00, free with every ticket.",
  },
  {
    title: "Camping",
    text: "The Pine Field opens Thursday at 16:00. Quiet zone after 01:00, family zone by the lake, lockers and charging in the barn.",
  },
  {
    title: "Access",
    text: "Step-free routes to every stage, viewing platforms at The Bowl and Terrace, a quiet room, and free carer tickets. Email us and we'll plan it with you.",
  },
  {
    title: "Sound & safety",
    text: "Free earplugs at every bar, sound levels kept under 100 dB at the front, welfare team on site around the clock.",
  },
];

export const FAQ = [
  {
    q: "Is there an age limit?",
    a: "18+ for the late stages after 22:00. Under-16s are welcome on Terrace and Moss Room until 21:00 with an adult.",
  },
  {
    q: "Can I bring my own food?",
    a: "Yes. Food for your own use is fine anywhere; glass and camping stoves outside the Pine Field are not.",
  },
  {
    q: "Is it cashless?",
    a: "Card and phone payments everywhere, and a cash top-up desk at the gate if you prefer.",
  },
  {
    q: "What happens if it rains?",
    a: "The quarry drains fast and every stage is covered. Bring boots anyway — the haul road gets muddy.",
  },
  {
    q: "Can I re-enter?",
    a: "Weekend holders can come and go freely. Day tickets allow re-entry until 23:00.",
  },
  {
    q: "Is the tunnel on this page really listening?",
    a: "Only if you ask it to. The demo set is generated in your browser, and the microphone feed is analysed on your device and never recorded or sent anywhere.",
  },
];

// Past editions: the fictional brand's history (social proof without fake quotes)
export const EDITIONS = [
  { year: "2019", text: "140 people, one borrowed rig, one very loud night." },
  { year: "2021", text: "The Shaft opens. Someone cries during the sunrise set." },
  { year: "2024", text: "Rewilding fund plants its 10,000th pine." },
  { year: "2026", text: "9,000 tickets, gone in 41 minutes." },
];
