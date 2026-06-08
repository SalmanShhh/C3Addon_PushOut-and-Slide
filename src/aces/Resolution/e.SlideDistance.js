export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The length of the along-surface movement preserved at the last resolution, in pixels.",
  params: [],
};

export const expose = false;

export default function () {
  return this._slideDistance;
}
