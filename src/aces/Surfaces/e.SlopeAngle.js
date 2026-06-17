export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The signed angle of the current floor relative to level, in degrees. 0 on flat ground; positive when the floor tilts down toward the object's right. Meaningful while Is on floor is true.",
  params: [],
};

export const expose = true;

export default function () {
  return this._slopeAngle;
}
