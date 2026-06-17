export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Clear solids",
  displayText: "{my} Clear all solids",
  description:
    "Remove all object types from this object's solid registry.",
  params: [],
};

export const expose = true;

export default function () {
  this._clearSolidTypes();
}
