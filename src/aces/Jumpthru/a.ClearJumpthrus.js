export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Clear jump-thrus",
  displayText: "{my} Clear all jump-thrus",
  description:
    "Remove all object types from this object's jump-thru registry.",
  params: [],
};

export const expose = true;

export default function () {
  this._clearJumpthruTypes();
}
