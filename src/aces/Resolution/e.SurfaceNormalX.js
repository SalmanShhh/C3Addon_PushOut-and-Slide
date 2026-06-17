export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The X component of the unit surface normal the object was pushed off (the push-out direction). 0 if nothing moved.",
  params: [],
};

export const expose = true;

export default function () {
  return this._surfaceNormalX;
}
