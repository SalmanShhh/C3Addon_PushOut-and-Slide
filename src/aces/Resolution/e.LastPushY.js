export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "The Y distance of the last correction, in pixels.",
  params: [],
};

export const expose = true;

export default function () {
  return this._lastPushY;
}
