import { RouterProvider } from "react-router-dom";
import { router } from "@/routes/index";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@radix-ui/themes/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <Theme>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastContainer position="top-center" autoClose={1500} />
      </QueryClientProvider>
    </Theme>
  );
}

export default App;
