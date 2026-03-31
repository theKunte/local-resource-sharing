import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResourceProvider, useResourceContext } from "../ResourceContext";

// Helper component to test the context
function TestConsumer() {
  const { resources, addResource } = useResourceContext();
  return (
    <div>
      <span data-testid="count">{resources.length}</span>
      <ul>
        {resources.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
      <button
        onClick={() => addResource({ title: "New Item", description: "Desc" })}
      >
        Add
      </button>
    </div>
  );
}

describe("ResourceContext", () => {
  it("starts with empty resources", () => {
    render(
      <ResourceProvider>
        <TestConsumer />
      </ResourceProvider>,
    );

    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("addResource adds a resource with an id", () => {
    render(
      <ResourceProvider>
        <TestConsumer />
      </ResourceProvider>,
    );

    fireEvent.click(screen.getByText("Add"));

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByText("New Item")).toBeInTheDocument();
  });

  it("adds resources to the front of the list", () => {
    render(
      <ResourceProvider>
        <TestConsumer />
      </ResourceProvider>,
    );

    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add"));

    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(2);
  });

  it("throws error when used outside provider", () => {
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useResourceContext must be used within ResourceProvider",
    );

    spy.mockRestore();
  });
});
