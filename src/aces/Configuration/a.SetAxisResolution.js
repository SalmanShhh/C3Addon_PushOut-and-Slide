export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set axis resolution",
  displayText: "{my} Set axis resolution to {0}",
  description:
    "Choose how overlaps are cleared. Minimum pushes along the single shortest direction (best for top-down). Separate clears the gravity axis before the cross axis, the stable land-then-touch-wall behaviour platformers expect.",
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "The axis resolution mode to use.",
      type: "combo",
      initialValue: "minimum",
      items: [
        { minimum: "Minimum" },
        { separate: "Separate (gravity axis first)" },
      ],
    },
  ],
};

export const expose = true;

export default function (mode) {
  this._setAxisResolution(mode);
}
