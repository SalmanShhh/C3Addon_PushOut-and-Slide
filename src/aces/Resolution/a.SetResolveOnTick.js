export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set resolve on tick",
  displayText: "{my} Set resolve on tick to {0}",
  description:
    "Set whether the object is corrected automatically every tick after movement. Turn it off to push out only when you call the Resolve now action (for example for detection-only or discrete corrections).",
  params: [
    {
      id: "enabled",
      name: "Enabled",
      desc: "Whether to resolve automatically every tick.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (enabled) {
  this._setResolveOnTick(enabled);
}
