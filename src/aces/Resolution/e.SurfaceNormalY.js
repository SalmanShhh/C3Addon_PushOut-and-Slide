export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The Y component of the unit surface normal. Use with SurfaceNormalX to detect which side a wall is on.",
  params: [],
};

export const expose = true;

export default function () {
  return this._surfaceNormalY;
}
