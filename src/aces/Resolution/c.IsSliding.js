export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is sliding",
  displayText: "Is sliding",
  description:
    "True if the last resolution preserved along-surface movement.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._isSliding;
}
