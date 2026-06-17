export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is on wall",
  displayText: "{my} Is on wall",
  description:
    "True if the last resolution pushed the object off a wall (a surface too steep to be a floor or ceiling). Only meaningful in Side-scrolling movement style.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._onWall;
}
