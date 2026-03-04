import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RepaymentSchedule from "./Repaymentschedule";
import {
  getLoanApplicationDetails,
  getUserApplications,
} from "../../services/loanService";

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}), { virtual: true });

jest.mock("../../Components/Navbar/Navbar", () => ({
  __esModule: true,
  default: () => <div>Navbar</div>,
}));

jest.mock("../../services/loanService", () => ({
  getLoanApplicationDetails: jest.fn(),
  getUserApplications: jest.fn(),
}));

describe("RepaymentSchedule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("shows error when no active loan accounts exist", async () => {
    mockUseLocation.mockReturnValue({ search: "", state: null });
    getUserApplications.mockResolvedValueOnce({
      data: [{ applicationId: "APP-0", status: "PENDING" }],
    });

    render(<RepaymentSchedule />);

    expect(await screen.findByText("No active loan accounts found for this account."))
      .toBeInTheDocument();
    expect(getLoanApplicationDetails).not.toHaveBeenCalled();
  });

  test("renders repayment data and supports account switching", async () => {
    mockUseLocation.mockReturnValue({ search: "?applicationId=APP-1", state: null });
    getUserApplications.mockResolvedValueOnce({
      data: [
        {
          applicationId: "APP-1",
          loanTypeId: "HOME_LOAN",
          status: "ACTIVE",
          disbursedAt: "2026-02-01T00:00:00.000Z",
        },
        {
          applicationId: "APP-2",
          loanTypeId: "PERSONAL_LOAN",
          status: "DISBURSED",
          disbursedAt: "2026-02-10T00:00:00.000Z",
        },
      ],
    });
    getLoanApplicationDetails.mockResolvedValueOnce({
      data: {
        loanAmount: 100000,
        repaymentSchedule: [
          {
            installmentNo: 1,
            dueDate: "2026-03-01",
            principalAmount: 5000,
            interestAmount: 500,
            totalPayment: 5500,
            balanceAmount: 95000,
            status: "PAID",
          },
          {
            installmentNo: 2,
            dueDate: "2026-04-01",
            principalAmount: 5000,
            interestAmount: 450,
            totalPayment: 5450,
            balanceAmount: 90000,
            status: "OVERDUE",
          },
        ],
      },
    });

    render(<RepaymentSchedule />);

    expect(await screen.findByText("Total Loan Amount")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Overdue Installments")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "APP-2" } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/repayment-schedule?applicationId=APP-2");
    });
  });
});
