export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Add jump-thru",
  displayText: "{my} Add {0} as a jump-thru",
  description:
    "Add an object type as a one-way platform for this object (used when Jump-thru source is Custom). The object can stand on instances of that type from above but pass through from below or the side.",
  params: [
    {
      id: "object",
      name: "Object",
      desc: "The object type to treat as a one-way platform.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (object) {
  this._addJumpthruType(object);
}
