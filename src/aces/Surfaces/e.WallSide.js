export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Which side a contacted wall is on, relative to the Up direction: -1 wall on the object's left, +1 wall on its right, 0 if not on a wall.",
  params: [],
};

export const expose = true;

export default function () {
  return this._wallSide;
}
