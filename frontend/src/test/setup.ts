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

// Mock motion/react (framer-motion) globally
vi.mock("motion/react", () => {
  const createMotionComponent = (tag: string) => {
    const Component = ({ children, ...props }: any) => {
      // Strip motion-specific props
      const {
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        whileInView,
        viewport,
        variants,
        layout,
        layoutId,
        drag,
        dragConstraints,
        onDragEnd,
        ...domProps
      } = props;
      const el = document.createElement(tag);
      Object.entries(domProps).forEach(([k, v]) => {
        if (typeof v === "string") el.setAttribute(k, v);
      });
      return { type: tag, props: { ...domProps, children } };
    };
    return Component;
  };

  const handler: ProxyHandler<object> = {
    get: (_target, prop: string) => {
      return ({ children, ...props }: any) => {
        const {
          initial,
          animate,
          exit,
          transition,
          whileHover,
          whileTap,
          whileInView,
          viewport,
          variants,
          layout,
          layoutId,
          ...domProps
        } = props;
        const React = require("react");
        return React.createElement(prop, domProps, children);
      };
    },
  };

  return {
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => true,
  };
});

// Mock lucide-react icons globally — explicit exports required by Vitest
vi.mock("lucide-react", () => {
  const React = require("react");
  const icon = (name: string) => (props: any) =>
    React.createElement("svg", { "data-testid": `icon-${name}`, ...props });
  return {
    Edit2: icon("Edit2"),
    Share2: icon("Share2"),
    Trash2: icon("Trash2"),
    Users: icon("Users"),
    Clock: icon("Clock"),
    X: icon("X"),
    Check: icon("Check"),
    Plus: icon("Plus"),
    Eye: icon("Eye"),
    UserPlus: icon("UserPlus"),
    DoorOpen: icon("DoorOpen"),
    ChevronRight: icon("ChevronRight"),
    Filter: icon("Filter"),
    Edit: icon("Edit"),
    Package: icon("Package"),
    AlertTriangle: icon("AlertTriangle"),
    Mail: icon("Mail"),
    Search: icon("Search"),
    ArrowLeft: icon("ArrowLeft"),
  };
});
