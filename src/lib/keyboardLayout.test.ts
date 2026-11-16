import { describe, expect, it } from "vitest";
import { getKeyboardRows, keyFor } from "./keyboardLayout";

describe("keyboardLayout", () => {
  it("maps nextChar to the correct physical key ID across QWERTY, Dvorak, Colemak, QWERTZ, and AZERTY", () => {
    // Logical 'a' sits on KeyA in QWERTY/Dvorak/Colemak/QWERTZ, but on KeyQ in AZERTY
    expect(keyFor("a", "qwerty").keyId).toBe("KeyA");
    expect(keyFor("a", "dvorak").keyId).toBe("KeyA");
    expect(keyFor("a", "colemak").keyId).toBe("KeyA");
    expect(keyFor("a", "azerty").keyId).toBe("KeyQ");

    // Logical 'e' sits on KeyD in Dvorak, KeyK in Colemak, and KeyE in QWERTY
    expect(keyFor("e", "dvorak").keyId).toBe("KeyD");
    expect(keyFor("e", "colemak").keyId).toBe("KeyK");
    expect(keyFor("e", "qwerty").keyId).toBe("KeyE");

    // Logical 'z' sits on KeyY in QWERTZ and KeyW in AZERTY
    expect(keyFor("z", "qwertz").keyId).toBe("KeyY");
    expect(keyFor("z", "azerty").keyId).toBe("KeyW");
  });

  it("detects shift, AltGr, and unmapped characters cleanly", () => {
    const upper = keyFor("E", "dvorak");
    expect(upper.keyId).toBe("KeyD");
    expect(upper.shift).toBe(true);
    expect(upper.unmapped).toBe(false);

    const azertyAt = keyFor("@", "azerty");
    expect(azertyAt.keyId).toBe("Digit0");
    expect(azertyAt.altGr).toBe(true);

    const unmapped = keyFor("€", "qwerty");
    expect(unmapped.unmapped).toBe(true);
    expect(unmapped.keyId).toBeNull();
  });

  it("supports ANSI vs ISO extra key and home-row anchors on every layout", () => {
    const ansiRows = getKeyboardRows("qwerty", "ansi");
    const isoRows = getKeyboardRows("qwerty", "iso");
    expect(ansiRows[3]!.some((c) => c.id === "IsoExtra")).toBe(false);
    expect(isoRows[3]!.some((c) => c.id === "IsoExtra")).toBe(true);

    for (const layout of ["qwerty", "dvorak", "colemak", "qwertz", "azerty"] as const) {
      const homeKeys = getKeyboardRows(layout, "ansi")
        .flat()
        .filter((k) => k.home);
      expect(homeKeys).toHaveLength(2);
    }
  });
});
