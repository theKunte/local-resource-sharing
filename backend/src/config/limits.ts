/**
 * Resource Limits Configuration
 *
 * These limits prevent abuse and ensure system performance.
 * Start conservative, monitor usage, and increase as needed.
 *
 * Current Tier: Tier 1 (Conservative - Recommended for Launch)
 * Rationale: Balanced limits suitable for production launch
 *
 * Growth Path:
 * - Monitor actual usage patterns via analytics
 * - Increase to Tier 2 (Generous) when average user reaches 60% of limit
 * - Tier 2 values: 100 groups, 500 members, 1000 resources, 50 group shares
 * - Consider tiered pricing for higher limits
 * - Add admin override capabilities for special cases
 *
 * Performance Notes:
 * - Limits help until pagination is fully implemented
 * - 4 endpoints still return all results (groups/:id/resources,
 *   groups/:id/members, users/:id/groups, resources/:id/groups)
 * - Once paginated, can safely increase to Tier 2 or remove some limits
 */

export const RESOURCE_LIMITS = {
  /**
   * Maximum groups a user can create/own
   * Current: 50 (Tier 1 - Conservative)
   * Tier 2: 100 (Generous)
   */
  MAX_GROUPS_PER_USER: 50,

  /**
   * Maximum members in a single group
   * Current: 100 (Tier 1 - Conservative)
   * Tier 2: 500 (Generous)
   * Note: Affects performance of GET /api/groups/:id/members
   */
  MAX_MEMBERS_PER_GROUP: 100,

  /**
   * Maximum resources shared to a single group
   * Current: 500 (Tier 1 - Conservative)
   * Tier 2: 1000 (Generous)
   * Note: Affects performance of GET /api/groups/:id/resources
   */
  MAX_RESOURCES_PER_GROUP: 500,

  /**
   * Maximum groups a single resource can be shared to
   * Current: 20 (Tier 1 - Conservative)
   * Tier 2: 50 (Generous)
   * Note: Affects performance of GET /api/resources/:id/groups
   */
  MAX_GROUPS_PER_RESOURCE: 20,
} as const;

/**
 * Error messages for limit violations
 */
export const LIMIT_ERROR_MESSAGES = {
  MAX_GROUPS_PER_USER: (current: number, limit: number) => ({
    error: "Group limit reached",
    message: `You can only create ${limit} groups. Please delete unused groups before creating more.`,
    currentCount: current,
    limit,
    suggestion: "Delete unused groups or contact support for higher limits.",
  }),

  MAX_MEMBERS_PER_GROUP: (current: number, limit: number) => ({
    error: "Member limit reached",
    message: `This group has reached its member limit (${limit} members).`,
    currentCount: current,
    limit,
    suggestion: "Consider creating a new group or removing inactive members.",
  }),

  MAX_RESOURCES_PER_GROUP: (current: number, limit: number) => ({
    error: "Resource limit reached",
    message: `This group has reached its resource limit (${limit} resources).`,
    currentCount: current,
    limit,
    suggestion: "Remove unused resources or create a new group.",
  }),

  MAX_GROUPS_PER_RESOURCE: (current: number, limit: number) => ({
    error: "Sharing limit reached",
    message: `This resource has been shared to the maximum number of groups (${limit}).`,
    currentCount: current,
    limit,
    suggestion: "Unshare from unused groups before sharing to new ones.",
  }),
} as const;
