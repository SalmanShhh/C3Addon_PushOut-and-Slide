export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The number of steps the object moves in during the current tick. 1 when stepping is disabled.",
  params: [],
};

export const expose = false;

export default function () {
  return this._stepCount;
}
