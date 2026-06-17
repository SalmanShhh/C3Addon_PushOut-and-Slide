export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description:
    "The name of the registered jump-thru object type at the given 0-based index.",
  params: [
    {
      id: "index",
      name: "Index",
      desc: "The 0-based position in the jump-thru registry.",
      type: "number",
    },
  ],
};

export const expose = true;

export default function (index) {
  return this._getJumpthruNameByIndex(index);
}
