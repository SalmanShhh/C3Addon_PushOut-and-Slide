export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The index of the current step, starting at 0. Meaningful inside On step.",
  params: [],
};

export const expose = true;

export default function () {
  return this._stepIndex;
}
