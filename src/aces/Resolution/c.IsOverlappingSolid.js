export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is overlapping solid",
  displayText: "{my} Is overlapping a solid",
  description:
    "True if this object currently overlaps at least one registered solid.",
  params: [],
};

export const expose = true;

export default function () {
  return this._isOverlappingAny();
}
