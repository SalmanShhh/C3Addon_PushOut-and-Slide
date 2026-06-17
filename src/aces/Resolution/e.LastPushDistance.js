export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The length of the last correction, in pixels. 0 if the last resolution moved nothing.",
  params: [],
};

export const expose = true;

export default function () {
  return this._lastPushDistance;
}
