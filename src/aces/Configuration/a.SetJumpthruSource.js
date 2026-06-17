export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set jump-thru source",
  displayText: "{my} Set jump-thru source to {0}",
  description:
    "Choose where one-way platforms come from. None disables them. Jump-thru behavior uses every object with the built-in Jump-thru behavior. Custom uses the types added with Add jump-thru.",
  params: [
    {
      id: "source",
      name: "Source",
      desc: "The jump-thru source to use.",
      type: "combo",
      initialValue: "none",
      items: [
        { none: "None" },
        { jumpthru: "Jump-thru behavior" },
        { custom: "Custom" },
      ],
    },
  ],
};

export const expose = true;

export default function (source) {
  this._setJumpthruSource(source);
}
