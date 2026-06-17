export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description:
    "The current resolution mode key (minimum_push, axis_x, axis_y, nearest_open or swept).",
  params: [],
};

export const expose = true;

export default function () {
  return this._resolutionMode;
}
