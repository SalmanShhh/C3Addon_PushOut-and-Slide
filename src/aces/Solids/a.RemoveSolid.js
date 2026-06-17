export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Remove solid",
  displayText: "{my} Remove {0} from solids",
  description:
    "Stop treating an object type as a solid for this object.",
  params: [
    {
      id: "object",
      name: "Object",
      desc: "The object type to stop treating as a solid.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (object) {
  this._removeSolidType(object);
}
