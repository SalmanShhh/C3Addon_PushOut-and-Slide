export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set max push per tick",
  displayText: "Set max push per tick to {0} px",
  description:
    "Set the maximum length of a single correction, in pixels. Set to 0 for no limit.",
  params: [
    {
      id: "pixels",
      name: "Pixels",
      desc: "The maximum length of a single correction, in pixels. 0 means no limit.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (pixels) {
  this._setMaxPushPerTick(pixels);
}
