import { Logger } from "../../src/utils/logger";

describe("Logger", () => {
  let logger: Logger;
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    logger = new Logger();
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(),
      warn: jest.spyOn(console, "warn").mockImplementation(),
      error: jest.spyOn(console, "error").mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs info messages", () => {
    logger.info("test message");
    expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    expect(consoleSpy.log.mock.calls[0][0]).toContain("[INFO]");
    expect(consoleSpy.log.mock.calls[0][0]).toContain("test message");
  });

  it("logs warn messages", () => {
    logger.warn("warning message");
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn.mock.calls[0][0]).toContain("[WARN]");
  });

  it("logs error messages with stack in development", () => {
    const err = new Error("boom");
    logger.error("error occurred", err);
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error.mock.calls[0][0]).toContain("[ERROR]");
    expect(consoleSpy.error.mock.calls[0][0]).toContain("error occurred");
  });

  it("logs security messages", () => {
    logger.security("auth failed", { ip: "1.2.3.4", endpoint: "/api/test" });
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn.mock.calls[0][0]).toContain("[SECURITY]");
    expect(consoleSpy.warn.mock.calls[0][0]).toContain("1.2.3.4");
  });

  it("logs audit messages", () => {
    logger.audit("resource created", { userId: "u1", action: "create" });
    expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    expect(consoleSpy.log.mock.calls[0][0]).toContain("[AUDIT]");
  });

  it("includes context as JSON", () => {
    logger.info("with context", { userId: "abc", endpoint: "/api/res" });
    const output = consoleSpy.log.mock.calls[0][0] as string;
    expect(output).toContain('"userId":"abc"');
    expect(output).toContain('"endpoint":"/api/res"');
  });

  it("includes ISO timestamp", () => {
    logger.info("timestamped");
    const output = consoleSpy.log.mock.calls[0][0] as string;
    // ISO 8601 pattern
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  describe("production mode - sensitive field sanitization", () => {
    let prodLogger: Logger;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
      prodLogger = new Logger();
    });

    afterEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("strips password from logged context in production", () => {
      prodLogger.info("user action", {
        userId: "u1",
        password: "secret123",
      });
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).not.toContain("secret123");
      expect(output).toContain('"userId":"u1"');
    });

    it("strips token from logged context in production", () => {
      prodLogger.info("api call", { userId: "u1", token: "tok-abc" });
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).not.toContain("tok-abc");
    });

    it("strips privateKey from logged context in production", () => {
      prodLogger.info("key event", { privateKey: "-----BEGIN RSA-----" });
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).not.toContain("-----BEGIN RSA-----");
    });

    it("strips secret from logged context in production", () => {
      prodLogger.info("secret event", { secret: "mysecret", userId: "u1" });
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).not.toContain("mysecret");
      expect(output).toContain('"userId":"u1"');
    });

    it("does not strip non-sensitive fields in production", () => {
      prodLogger.info("normal event", { userId: "u1", endpoint: "/api/res" });
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('"userId":"u1"');
      expect(output).toContain('"/api/res"');
    });
  });
});
