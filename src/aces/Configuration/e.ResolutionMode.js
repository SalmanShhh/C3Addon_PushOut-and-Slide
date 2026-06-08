export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description:
    "The current resolution mode key (minimum_push, axis_x, axis_y or nearest_open).",
  params: [],
};

export const expose = false;

export default function () {
  return this._resolutionMode;
}
