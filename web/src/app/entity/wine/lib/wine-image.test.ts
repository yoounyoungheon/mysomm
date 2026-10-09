import { expect, it } from "vitest";
import { resolveWineBottleImage } from "./wine-image";

it.each([13, {}, [], null, undefined])(
  "handles non-string image values %#",
  (value) => {
    expect(
      resolveWineBottleImage(
        { wineBottleImageUrl: value as unknown as string },
        "wine",
      ).isPlaceholder,
    ).toBe(true);
  },
);
it("keeps a valid image", () => {
  expect(
    resolveWineBottleImage(
      { wineBottleImageUrl: " /images/wines/wine-bottle.png " },
      "wine",
    ),
  ).toEqual({ src: "/images/wines/wine-bottle.png", isPlaceholder: false });
});
