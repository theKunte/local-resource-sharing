/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";

export type Resource = {
  id: number;
  title: string;
  description: string;
  image?: string;
};

type ResourceContextType = {
  resources: Resource[];
  addResource: (resource: Omit<Resource, "id">) => void;
};

const ResourceContext = createContext<ResourceContextType | undefined>(
  undefined
);

export const ResourceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);

  const addResource = (resource: Omit<Resource, "id">) => {
    setResources((prev) => [{ ...resource, id: Date.now() }, ...prev]);
  };

  return (
    <ResourceContext.Provider value={{ resources, addResource }}>
      {children}
    </ResourceContext.Provider>
  );
};

export const useResourceContext = () => {
  const ctx = useContext(ResourceContext);
  if (!ctx)
    throw new Error("useResourceContext must be used within ResourceProvider");
  return ctx;
};
