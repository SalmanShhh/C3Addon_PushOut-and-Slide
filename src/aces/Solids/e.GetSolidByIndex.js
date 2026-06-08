export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description:
    "The name of the registered solid object type at the given 0-based index.",
  params: [
    {
      id: "index",
      name: "Index",
      desc: "The 0-based position in the solid registry.",
      type: "number",
    },
  ],
};

export const expose = false;

export default function (index) {
  return this._getSolidNameByIndex(index);
}
