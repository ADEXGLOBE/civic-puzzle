const fallbackNews = [
  {
    answer: "Ballarat Council launches digital innovation drive",
    puzzle: "innovation Ballarat drive Council digital launches",
    hint: "Starts with: Ballarat • Ends with: drive",
    readMoreUrl: "https://www.abc.net.au/news/ballarat",
    progressiveHints: [],
    offlineFallback: true,
  },
  {
    answer: "Local artists light up Bridge Mall with new mural",
    puzzle: "Mall artists mural Bridge Local new light with up",
    hint: "Starts with: Local • Ends with: mural",
    readMoreUrl: "https://www.abc.net.au/news/ballarat",
    progressiveHints: [],
    offlineFallback: true,
  },
];

const fallbackFacts = [
  {
    text: "Ballarat became a major Victorian gold rush centre in the 1850s.",
    hint: "A quick fact about Ballarat history.",
    readMoreUrl: "https://en.wikipedia.org/wiki/Ballarat",
    progressiveHints: [],
    offlineFallback: true,
  },
];

export function getBundledFallback(mode) {
  if (mode === "news") return fallbackNews;
  if (mode === "facts") return fallbackFacts;
  return [];
}
