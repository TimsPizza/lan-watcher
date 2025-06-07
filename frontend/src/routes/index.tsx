import { Dashboard } from "@/routes/Dashboard";
import { DevicesPage } from "@/routes/DevicesPage";
import Layout from "@/routes/Layout";
import { SettingsPage } from "@/routes/SettingsPage";
import { TimelinePage } from "@/routes/TimelinePage";
import { createHashRouter, RouteObject } from "react-router-dom";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "devices",
        element: <DevicesPage />,
      },
      {
        path: "timeline",
        element: <TimelinePage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
];

export const router = createHashRouter(routes);
