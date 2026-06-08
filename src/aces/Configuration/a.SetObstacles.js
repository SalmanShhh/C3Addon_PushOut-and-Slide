export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set obstacles",
  displayText: "Set obstacles to {0}",
  description:
    "Choose which objects count as walls: Custom uses the types added with Add solid, Solids uses every object with the built-in Solid behavior.",
  params: [
    {
      id: "mode",
      name: "Obstacles",
      desc: "The obstacle source to use.",
      type: "combo",
      initialValue: "solids",
      items: [{ custom: "Custom" }, { solids: "Solids" }],
    },
  ],
};

export const expose = true;

export default function (mode) {
  this._setObstacleMode(mode);
}
