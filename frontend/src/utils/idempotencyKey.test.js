import { generateIdempotencyKey } from "./idempotencyKey";

describe("generateIdempotencyKey", () => {
  const originalCrypto = global.crypto;

  afterEach(() => {
    global.crypto = originalCrypto;
    jest.restoreAllMocks();
  });

  test("uses crypto.randomUUID when available", () => {
    global.crypto = {
      randomUUID: jest.fn(() => "uuid-123"),
    };

    expect(generateIdempotencyKey()).toBe("uuid-123");
  });

  test("uses crypto.getRandomValues fallback", () => {
    global.crypto = {
      getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = i + 1;
        return arr;
      }),
    };

    const key = generateIdempotencyKey();

    expect(key).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
    );
  });

  test("falls back to timestamp-random format when crypto is unavailable", () => {
    global.crypto = undefined;
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    const key = generateIdempotencyKey();

    expect(key).toMatch(/^1700000000000-[a-f0-9]+$/);
  });
});
