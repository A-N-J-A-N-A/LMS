describe("api client", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
  });

  test("configures axios instance and auth interceptor", () => {
    jest.isolateModules(() => {
      const requestUse = jest.fn();
      const responseUse = jest.fn();
      const instance = {
        interceptors: { request: { use: requestUse }, response: { use: responseUse } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => instance),
      }));

      // eslint-disable-next-line global-require
      const axios = require("axios");
      // eslint-disable-next-line global-require
      const api = require("./api").default;

      expect(api).toBe(instance);
      expect(axios.create).toHaveBeenCalledWith({ baseURL: "http://localhost:8080" });
      expect(requestUse).toHaveBeenCalledTimes(1);
      expect(responseUse).toHaveBeenCalledTimes(1);
    });
  });

  test("injects Authorization header when token exists", () => {
    jest.isolateModules(() => {
      const requestUse = jest.fn();
      const responseUse = jest.fn();
      const instance = {
        interceptors: { request: { use: requestUse }, response: { use: responseUse } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => instance),
      }));

      // eslint-disable-next-line global-require
      require("./api");
      localStorage.setItem("token", "token-1");

      const interceptor = requestUse.mock.calls[0][0];
      const config = { headers: {} };
      const updated = interceptor(config);

      expect(updated.headers.Authorization).toBe("Bearer token-1");
    });
  });

  test("does not inject Authorization header when token is missing", () => {
    jest.isolateModules(() => {
      const requestUse = jest.fn();
      const responseUse = jest.fn();
      const instance = {
        interceptors: { request: { use: requestUse }, response: { use: responseUse } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => instance),
      }));

      // eslint-disable-next-line global-require
      require("./api");

      const interceptor = requestUse.mock.calls[0][0];
      const config = { headers: {} };
      const updated = interceptor(config);

      expect(updated.headers.Authorization).toBeUndefined();
    });
  });
});
