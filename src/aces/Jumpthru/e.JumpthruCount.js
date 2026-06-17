export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The number of object types currently registered as jump-thrus.",
  params: [],
};

export const expose = true;

export default function () {
  return this._jumpthruTypes.size;
}
