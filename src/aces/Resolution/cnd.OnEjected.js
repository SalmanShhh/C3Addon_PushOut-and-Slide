export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On ejected",
  displayText: "{my} On ejected",
  description:
    "Triggered after Eject to nearest open space succeeds. LastPushX and LastPushY give the offset from the original to the ejected position.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
