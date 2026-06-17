export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set resolution mode",
  displayText: "{my} Set resolution mode to {0}",
  description: "Set how the push-out correction is computed.",
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "The resolution mode to use.",
      type: "combo",
      initialValue: "minimum_push",
      items: [
        { minimum_push: "Minimum push" },
        { axis_x: "Axis X only" },
        { axis_y: "Axis Y only" },
        { nearest_open: "Nearest open space" },
        { swept: "Swept (continuous)" },
      ],
    },
  ],
};

export const expose = true;

export default function (mode) {
  this._setResolutionMode(mode);
}
