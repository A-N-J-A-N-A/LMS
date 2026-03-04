import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLoanDisbursement from "./AdminLoanDisbursement";
import { disburseLoan, getAllApplications } from "../../services/admin/adminLoanService";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock("../../Components/admin/AdminLayout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../services/admin/adminLoanService", () => ({
  disburseLoan: jest.fn(),
  getAllApplications: jest.fn(),
}));

const approvedApplications = [
  {
    applicationId: "APP-101",
    customerName: "Test User",
    loanTypeId: "HOME_LOAN",
    amount: 200000,
  },
];

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

describe("AdminLoanDisbursement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("role", "ADMIN");
  });

  test("redirects non-admin users to admin login", async () => {
    localStorage.setItem("role", "USER");
    getAllApplications.mockResolvedValueOnce([]);

    renderWithQueryClient(<AdminLoanDisbursement />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/login");
    });
  });

  test("shows empty state when approved applications API fails", async () => {
    getAllApplications.mockRejectedValueOnce(new Error("network error"));

    renderWithQueryClient(<AdminLoanDisbursement />);

    expect(await screen.findByText("No approved applications available for disbursement.")).toBeInTheDocument();
    expect(disburseLoan).not.toHaveBeenCalled();
  });

  test("validates disbursement amount and shows inline error", async () => {
    getAllApplications.mockResolvedValue(approvedApplications);

    renderWithQueryClient(<AdminLoanDisbursement />);

    await screen.findByText("APP-101");

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Provide Loan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter a valid disbursement amount."
    );
    expect(disburseLoan).not.toHaveBeenCalled();
  });

  test("disburses loan and shows success banner", async () => {
    getAllApplications
      .mockResolvedValueOnce(approvedApplications)
      .mockResolvedValueOnce(approvedApplications);
    disburseLoan.mockResolvedValueOnce({ message: "ok" });

    renderWithQueryClient(<AdminLoanDisbursement />);

    await screen.findByText("APP-101");

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "150000" } });
    fireEvent.click(screen.getByRole("button", { name: "Provide Loan" }));

    await waitFor(() => {
      expect(disburseLoan).toHaveBeenCalledWith("APP-101", 150000);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Loan APP-101 disbursed successfully."
    );
  });
});
