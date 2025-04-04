// Name: Cast
// ID: lmsCast
// Description: Convert values between types.
// By: LilyMakesThings <https://scratch.mit.edu/users/LilyMakesThings/>
// License: MIT AND LGPL-3.0

(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;

  class CastUtil {
    getInfo() {
      return {
        id: "lmsCast",
        name: Scratch.translate("Cast"),
        blocks: [
          {
            opcode: "toType",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("cast [INPUT] to [TYPE]"),
            allowDropAnywhere: true,
            disableMonitor: true,
            arguments: {
              INPUT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "type",
              },
            },
          },
          {
            opcode: "typeOf",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("type of [INPUT]"),
            disableMonitor: true,
            arguments: {
              INPUT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
            },
          },
        ],
        menus: {
          type: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("number"),
                value: "number",
              },
              {
                text: Scratch.translate("string"),
                value: "string",
              },
              {
                text: Scratch.translate("boolean"),
                value: "boolean",
              },
              {
                text: Scratch.translate("default"),
                value: "default",
              },
            ],
          },
        },
      };
    }

    toType(args) {
      const input = args.INPUT;
      switch (args.TYPE) {
        case "number":
          return Cast.toNumber(input);
        case "string":
          return Cast.toString(input);
        case "boolean":
          return Cast.toBoolean(input);
        default:
          return input;
      }
    }

    typeOf(args) {
      return typeof args.INPUT;
    }
  }

  Scratch.extensions.register(new CastUtil());
})(Scratch);
