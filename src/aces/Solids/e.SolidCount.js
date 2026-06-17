export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "The number of object types currently registered as solids.",
  params: [],
};

export const expose = true;

export default function () {
  return this._solidTypes.size;
}
