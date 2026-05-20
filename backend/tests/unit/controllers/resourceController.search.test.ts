/**
 * Tests for search query sanitization and multi-category filtering
 */
import { Request, Response } from "express";
import { searchResources } from "../../../src/controllers/resourceController";
import prisma from "../../../src/prisma";

// Mock Prisma
jest.mock("../../../src/prisma", () => ({
  __esModule: true,
  default: {
    resource: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    groupMember: {
      findMany: jest.fn(),
    },
  },
}));

describe("Resource Controller - Search Security", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      user: {
        uid: "test-user-123",
        email: "test@example.com",
        emailVerified: true,
      },
      query: {},
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Default mock responses
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
      { groupId: "group-1" },
      { groupId: "group-2" },
    ]);

    (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.resource.count as jest.Mock).mockResolvedValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Search Query Sanitization - 100 Character Limit", () => {
    it("should accept queries under 100 characters", async () => {
      mockRequest.query = { q: "camping gear" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe("camping gear");
    });

    it("should truncate query to exactly 100 characters", async () => {
      const longQuery = "a".repeat(150); // 150 characters
      mockRequest.query = { q: longQuery };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      const sanitizedQuery = prismaCall.where.AND[0].OR[0].title.contains;
      expect(sanitizedQuery.length).toBe(100);
      expect(sanitizedQuery).toBe("a".repeat(100));
    });

    it("should handle exactly 100 character query", async () => {
      const exactQuery = "b".repeat(100);
      mockRequest.query = { q: exactQuery };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe(exactQuery);
    });

    it("should truncate query at 100 chars before special char removal", async () => {
      const longQuery = "a".repeat(95) + "!@#$%";
      mockRequest.query = { q: longQuery };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      const sanitizedQuery = prismaCall.where.AND[0].OR[0].title.contains;
      expect(sanitizedQuery.length).toBeLessThanOrEqual(100);
      expect(sanitizedQuery).toBe("a".repeat(95)); // Special chars removed
    });
  });

  describe("Search Query Sanitization - Special Character Removal", () => {
    it("should remove SQL injection attempts", async () => {
      mockRequest.query = { q: "tent' OR '1'='1" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe("tent OR 11");
    });

    it("should remove XSS script tags", async () => {
      mockRequest.query = { q: "<script>alert('xss')</script>camping" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe(
        "scriptalertxssscriptcamping",
      );
    });

    it("should remove special characters but keep alphanumeric", async () => {
      mockRequest.query = { q: "camping@123!gear#456$tent" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe(
        "camping123gear456tent",
      );
    });

    it("should preserve hyphens in search query", async () => {
      mockRequest.query = { q: "camping-gear-outdoor-equipment" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe(
        "camping-gear-outdoor-equipment",
      );
    });

    it("should preserve spaces and underscores", async () => {
      mockRequest.query = { q: "camping gear_outdoor" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe(
        "camping gear_outdoor",
      );
    });

    it("should remove punctuation characters", async () => {
      mockRequest.query = { q: "camping!@#$%^&*()gear" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe("campinggear");
    });

    it("should handle query with only special characters", async () => {
      mockRequest.query = { q: "!@#$%^&*()" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      // Empty query after sanitization - no search condition should be added
      // First element in AND array should be the ownership conditions
      expect(prismaCall.where.AND[0].OR).toBeDefined();
      expect(prismaCall.where.AND[0].OR[0]).toHaveProperty("ownerId");
    });

    it("should handle empty query after sanitization", async () => {
      mockRequest.query = { q: "   " };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      // Empty query after sanitization - no search condition should be added
      // First element in AND array should be the ownership conditions
      expect(prismaCall.where.AND[0].OR).toBeDefined();
      expect(prismaCall.where.AND[0].OR[0]).toHaveProperty("ownerId");
    });
  });

  describe("Multi-Category OR Logic", () => {
    it("should search single category correctly", async () => {
      mockRequest.query = { category: "Climbing & Mountaineering" };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
      ]);
    });

    it("should search multiple categories with OR logic", async () => {
      mockRequest.query = { category: ["Climbing & Mountaineering", "Water Sports", "Cycling"] };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
        { category: { has: "Water Sports" } },
        { category: { has: "Cycling" } },
      ]);
    });

    it("should filter out invalid categories in multi-category search", async () => {
      mockRequest.query = {
        category: [
          "Climbing & Mountaineering",
          "InvalidCategory",
          "Water Sports",
          "FakeCategory",
        ],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
        { category: { has: "Water Sports" } },
      ]);
    });

    it("should handle category array with duplicates", async () => {
      mockRequest.query = {
        category: ["Climbing & Mountaineering", "Water Sports", "Climbing & Mountaineering", "Water Sports"],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
        { category: { has: "Water Sports" } },
      ]);
    });

    it("should handle more than 5 categories (respects sanitizeCategories limit)", async () => {
      mockRequest.query = {
        category: [
          "Climbing & Mountaineering",
          "Water Sports",
          "Snow Sports",
          "Cycling",
          "Navigation & Safety",
          "Packs & Storage",
          "Other",
        ],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      // Should only include first 5 valid categories
      expect(prismaCall.where.AND[0].OR).toHaveLength(5);
    });

    it("should not include category filter when no valid categories", async () => {
      mockRequest.query = { category: ["InvalidCategory", "FakeCategory"] };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      // Should not have category OR filter
      expect(prismaCall.where.AND.length).toBe(1); // Only the sharedWith filter
    });

    it("should handle empty category array", async () => {
      mockRequest.query = { category: [] };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND.length).toBe(1);
    });
  });

  describe("Combined Search and Category Filtering", () => {
    it("should apply both query sanitization and category filtering", async () => {
      mockRequest.query = {
        q: "camping!@#gear",
        category: ["Climbing & Mountaineering", "Water Sports"],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];

      // Check query sanitization
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe("campinggear");

      // Check multi-category OR
      expect(prismaCall.where.AND[1].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
        { category: { has: "Water Sports" } },
      ]);
    });

    it("should handle long query with multiple categories", async () => {
      const longQuery = "camping ".repeat(20); // > 100 chars
      mockRequest.query = {
        q: longQuery,
        category: ["Climbing & Mountaineering", "Water Sports", "Cycling"],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];

      // Check truncation
      expect(
        prismaCall.where.AND[0].OR[0].title.contains.length,
      ).toBeLessThanOrEqual(100);

      // Check categories
      expect(prismaCall.where.AND[1].OR).toHaveLength(3);
    });

    it("should handle SQL injection in query with category filtering", async () => {
      mockRequest.query = {
        q: "'; DROP TABLE resources; --",
        category: ["Climbing' OR '1'='1", "Water Sports"],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];

      // Query should be sanitized
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe(
        " DROP TABLE resources --",
      );

      // Only valid category should remain
      expect(prismaCall.where.AND[1].OR).toEqual([
        { category: { has: "Water Sports" } },
      ]);
    });
  });

  describe("Attack Vector Prevention", () => {
    it("should prevent ReDoS with extremely long input", async () => {
      mockRequest.query = { q: "a".repeat(10000) };

      const start = Date.now();
      await searchResources(mockRequest as Request, mockResponse as Response);
      const duration = Date.now() - start;

      // Should execute quickly (< 100ms) due to truncation
      expect(duration).toBeLessThan(100);
    });

    it("should prevent NoSQL injection attempts", async () => {
      mockRequest.query = {
        q: "$ne",
        category: ["$where", "Climbing & Mountaineering"],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR[0].title.contains).toBe("ne");
      expect(prismaCall.where.AND[1].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
      ]);
    });

    it("should handle path traversal attempts in category", async () => {
      mockRequest.query = {
        category: ["../../../etc/passwd", "Climbing & Mountaineering"],
      };

      await searchResources(mockRequest as Request, mockResponse as Response);

      const prismaCall = (prisma.resource.findMany as jest.Mock).mock
        .calls[0][0];
      expect(prismaCall.where.AND[0].OR).toEqual([
        { category: { has: "Climbing & Mountaineering" } },
      ]);
    });
  });
});
