import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";

// mock navigate
const mockNavigate = jest.fn();

// v7-safe mock (NO requireActual)
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

// mock fetch globally
global.fetch = jest.fn();

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders login form", () => {
    render(<Login />);

    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@crediflow.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  test("shows error when fields are empty", () => {
    render(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      screen.getByText(/email and password required/i)
    ).toBeInTheDocument();
  });

  test("shows error for invalid email format", () => {
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("name@crediflow.com"), {
      target: { value: "invalidemail" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      screen.getByText(/invalid email format/i)
    ).toBeInTheDocument();
  });

  test("successful login stores token and navigates", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock-token" }),
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("name@crediflow.com"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "Password@123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("mock-token");
      expect(localStorage.getItem("role")).toBe("USER");
      expect(mockNavigate).toHaveBeenCalledWith("/loans");
    });
  });

  test("shows error when login fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid credentials" }),
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("name@crediflow.com"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid credentials/i)
      ).toBeInTheDocument();
    });
  });

  test("shows error when login response has no token", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("name@crediflow.com"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "Password@123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/login response missing token/i)).toBeInTheDocument();
    });
  });
});

