export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The number of distinct solids the object overlapped at the last resolution.",
  params: [],
};

export const expose = false;

export default function () {
  return this._overlapCount;
}
