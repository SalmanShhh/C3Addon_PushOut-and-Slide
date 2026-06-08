export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On became trapped",
  displayText: "On became trapped",
  description:
    "Triggered when a resolution cannot free the object because it overlaps solids on opposing sides. OverlapCount reports how many solids it is wedged against.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
