export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is enabled",
  displayText: "Is enabled",
  description: "True if the behavior is enabled.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._enabled;
}
