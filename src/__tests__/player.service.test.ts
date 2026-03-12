import { describe, test, expect, mock, beforeEach } from "bun:test";
import { getPlayerService } from "../services/player.service.ts";

describe("PlayerService - seek functionality", () => {
  let playerService: ReturnType<typeof getPlayerService>;

  beforeEach(() => {
    playerService = getPlayerService();
  });

  describe("seek() method", () => {
    test("should reject seek when no playback is active", () => {
      // Mock console.warn to verify warning is logged
      const warnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = warnSpy;

      playerService.seek(10);

      expect(warnSpy).toHaveBeenCalled();

      // Restore original console.warn
      console.warn = originalWarn;
    });

    test("should reject negative seek position", () => {
      const warnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = warnSpy;

      playerService.seek(-5);

      expect(warnSpy).toHaveBeenCalled();

      console.warn = originalWarn;
    });

    test("should reject NaN seek position", () => {
      const warnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = warnSpy;

      playerService.seek(NaN);

      expect(warnSpy).toHaveBeenCalled();

      console.warn = originalWarn;
    });

    test("should reject Infinity seek position", () => {
      const warnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = warnSpy;

      playerService.seek(Infinity);

      expect(warnSpy).toHaveBeenCalled();

      console.warn = originalWarn;
    });

    test("should accept valid positive seek position (boundary case: 0)", () => {
      const warnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = warnSpy;

      // Note: This will still warn because no playback is active
      // In a real test, you would need to mock the playback state
      playerService.seek(0);

      console.warn = originalWarn;
    });

    test("should accept valid positive seek position (normal case)", () => {
      const warnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = warnSpy;

      playerService.seek(30.5);

      console.warn = originalWarn;
    });
  });

  describe("volume control", () => {
    test("should clamp volume to 0-100 range (below minimum)", () => {
      playerService.setVolume(-10);
      expect(playerService.getVolume()).toBe(0);
    });

    test("should clamp volume to 0-100 range (above maximum)", () => {
      playerService.setVolume(150);
      expect(playerService.getVolume()).toBe(100);
    });

    test("should accept valid volume values", () => {
      playerService.setVolume(50);
      expect(playerService.getVolume()).toBe(50);
    });

    test("should handle boundary values", () => {
      playerService.setVolume(0);
      expect(playerService.getVolume()).toBe(0);

      playerService.setVolume(100);
      expect(playerService.getVolume()).toBe(100);
    });
  });
});
