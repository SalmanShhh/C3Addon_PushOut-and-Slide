export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description: "The current movement style key (top_down or side_scroller).",
  params: [],
};

export const expose = true;

export default function () {
  return this._movementStyle;
}
