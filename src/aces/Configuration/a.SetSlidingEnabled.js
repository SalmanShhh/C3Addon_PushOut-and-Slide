export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set sliding enabled",
  displayText: "{my} Set sliding enabled to {0}",
  description:
    "Set whether the object slides along solid surfaces instead of stopping at them.",
  params: [
    {
      id: "enabled",
      name: "Enabled",
      desc: "Whether sliding is enabled.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (enabled) {
  this._setSlidingEnabled(enabled);
}
