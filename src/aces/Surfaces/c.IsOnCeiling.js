export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is on ceiling",
  displayText: "{my} Is on ceiling",
  description:
    "True if the last resolution pushed the object off a ceiling (a surface facing against the Up direction). Only meaningful in Side-scrolling movement style.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._onCeiling;
}
