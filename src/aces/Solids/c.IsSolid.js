export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is solid",
  displayText: "{my} {0} is registered as a solid",
  description:
    "True if the given object type is registered as a solid for this object.",
  params: [
    {
      id: "object",
      name: "Object",
      desc: "The object type to check.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (object) {
  return this._isSolidType(object);
}
