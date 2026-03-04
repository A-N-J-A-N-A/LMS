import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ActiveLoans from "./ActiveLoans";

global.fetch = jest.fn();

const renderWithQueryClient = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("ActiveLoans Component", () => {
  const token = "mock-token";

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("shows loading state while applications are being fetched", async () => {
    let resolveFetch;
    fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    renderWithQueryClient(<ActiveLoans token={token} />);
    expect(screen.getByText(/loading loan applications/i)).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => [],
    });

    await waitFor(() =>
      expect(screen.getByText(/no loan applications found/i)).toBeInTheDocument()
    );
  });

  test("renders applications when API call succeeds", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          loanTypeId: "HOME_LOAN",
          amount: 500000,
          status: "APPROVED",
          tenure: 24,
          createdAt: "2025-01-15T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<ActiveLoans token={token} />);

    await waitFor(() => expect(screen.getByText(/total applied amount/i)).toBeInTheDocument());

    expect(screen.getByText(/home loan/i)).toBeInTheDocument();
    expect(screen.getByText(/app id:\s*1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rs 5,00,000.00/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/approved/i).length).toBeGreaterThan(0);
  });

  test("shows no applications message when API returns empty list", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithQueryClient(<ActiveLoans token={token} />);

    await waitFor(() =>
      expect(screen.getByText(/no loan applications found/i)).toBeInTheDocument()
    );
  });

  test("shows error message when API call fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Unauthorized" }),
    });

    renderWithQueryClient(<ActiveLoans token={token} />);

    await waitFor(() =>
      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument()
    );
  });

  test("does not call API when token is missing", () => {
    renderWithQueryClient(<ActiveLoans token={null} />);

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/no loan applications found/i)).toBeInTheDocument();
  });
});
