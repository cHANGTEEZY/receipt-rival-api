export const SHAME_TITLE_BANDS = [
  {
    min: 0,
    max: 0,
    titles: [
      "Clean Hands",
      "Paid in Full",
      "No Notes Needed",
      "Receipt Angel",
    ],
  },
  {
    min: 1,
    max: 24,
    titles: [
      "Forgot His Wallet",
      'The "I\'ll Venmo You"',
      "Almost Paid",
      "One More Day",
    ],
  },
  {
    min: 25,
    max: 49,
    titles: [
      "Serial Dodger",
      "Eventually Payer",
      "Tab Ghost",
      "IOU Collector",
    ],
  },
  {
    min: 50,
    max: 74,
    titles: [
      "Excuse Master",
      "Chronic Later",
      "Split Avoider",
      "The Follow-Up",
    ],
  },
  {
    min: 75,
    max: 100,
    titles: [
      "The Wallet Ghost",
      "Emotional Damage",
      "Unreachable",
      "Professionally Late",
    ],
  },
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export const FAME_TITLE_BANDS = [
  {
    min: 80,
    max: 100,
    titles: [
      "Receipt Angel",
      "Instant Venmo",
      "Split Saint",
      "Paid Before Asked",
    ],
  },
  {
    min: 55,
    max: 79,
    titles: [
      "Reliable Roommate",
      "On Time Legend",
      "Fair Splitter",
      "Clean Hands",
    ],
  },
  {
    min: 30,
    max: 54,
    titles: [
      "Gets It Done",
      "Mostly Solid",
      "Decent Payer",
      "No Drama",
    ],
  },
  {
    min: 0,
    max: 29,
    titles: [
      "Working On It",
      "One More Nudge",
      "Almost Famous",
      "Still Learning",
    ],
  },
] as const;

type TitleBand = {
  min: number;
  max: number;
  titles: readonly string[];
};

function pickTitle(userId: string, score: number, bands: readonly TitleBand[]): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band =
    bands.find((item) => clamped >= item.min && clamped <= item.max) ?? bands[0];
  const titles = band.titles;
  return titles[hashString(userId) % titles.length] ?? titles[0] ?? "Clean Hands";
}

export function pickShameTitle(userId: string, shameScore: number): string {
  return pickTitle(userId, shameScore, SHAME_TITLE_BANDS);
}

export function pickFameTitle(userId: string, fameScore: number): string {
  return pickTitle(userId, fameScore, FAME_TITLE_BANDS);
}
