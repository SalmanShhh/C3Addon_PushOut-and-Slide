export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set slide friction",
  displayText: "Set slide friction to {0}%",
  description:
    "Set the fraction of along-surface speed lost per resolution, from 0 (frictionless) to 1 (full stop). Values are clamped to that range.",
  params: [
    {
      id: "friction",
      name: "Friction",
      desc: "The friction fraction, from 0 (frictionless) to 1 (full stop).",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (friction) {
  this._setSlideFriction(friction);
}
