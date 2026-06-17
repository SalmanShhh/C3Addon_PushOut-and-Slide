export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The Y distance of the along-surface movement preserved, in pixels.",
  params: [],
};

export const expose = true;

export default function () {
  return this._slideY;
}
