export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The Y component of the unit normal of the last floor contact (points away from the floor). 0 if no floor has been contacted.",
  params: [],
};

export const expose = true;

export default function () {
  return this._floorNY;
}
