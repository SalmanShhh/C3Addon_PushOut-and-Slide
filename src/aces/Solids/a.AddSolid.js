export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Add solid",
  displayText: "{my} Add {0} as a solid",
  description:
    "Add an object type as a solid for this object. Instances of that type will push this object out. Adding the same type twice has no effect.",
  params: [
    {
      id: "object",
      name: "Object",
      desc: "The object type to treat as a solid.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (object) {
  this._addSolidType(object);
}
