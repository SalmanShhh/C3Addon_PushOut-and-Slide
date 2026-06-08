export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is trapped",
  displayText: "Is trapped",
  description:
    "True if the last resolution left this object wedged against opposing solids.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._isTrapped;
}
