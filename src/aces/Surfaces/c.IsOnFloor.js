export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is on floor",
  displayText: "{my} Is on floor",
  description:
    "True if the last resolution pushed the object off a floor (a surface facing the Up direction). Only meaningful in Side-scrolling movement style.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._onFloor;
}
