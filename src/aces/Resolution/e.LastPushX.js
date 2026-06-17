export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "The X distance of the last correction, in pixels.",
  params: [],
};

export const expose = true;

export default function () {
  return this._lastPushX;
}
