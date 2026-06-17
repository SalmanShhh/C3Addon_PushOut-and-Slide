export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Remove jump-thru",
  displayText: "{my} Remove {0} from jump-thrus",
  description:
    "Stop treating an object type as a one-way platform for this object.",
  params: [
    {
      id: "object",
      name: "Object",
      desc: "The object type to stop treating as a one-way platform.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (object) {
  this._removeJumpthruType(object);
}
