import "@testing-library/jest-dom/vitest";

// Mock firebase modules globally for all tests
vi.mock("../firebase", () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
  },
  db: {},
}));

// Mock react-router-dom's useNavigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});
