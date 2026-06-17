export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set up direction",
  displayText: "{my} Set up direction to {0}",
  description:
    "Set which screen direction points away from gravity. Used in Side-scrolling style to tell a floor from a ceiling and to land objects on jump-thru platforms.",
  params: [
    {
      id: "direction",
      name: "Direction",
      desc: "The screen direction that points away from gravity.",
      type: "combo",
      initialValue: "up",
      items: [
        { up: "Up (-Y)" },
        { down: "Down (+Y)" },
        { left: "Left (-X)" },
        { right: "Right (+X)" },
      ],
    },
  ],
};

export const expose = true;

export default function (direction) {
  this._setUpDirection(direction);
}
