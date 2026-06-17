export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set enabled",
  displayText: "{my} Set enabled to {0}",
  description: "Set whether the behavior resolves.",
  params: [
    {
      id: "enabled",
      name: "Enabled",
      desc: "Whether the behavior resolves.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (enabled) {
  this._setEnabled(enabled);
}
