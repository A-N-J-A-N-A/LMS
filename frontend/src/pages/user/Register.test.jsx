import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Register from "./Register";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

const renderRegister = () => render(<Register />);

const getTextInputs = () => screen.getAllByRole("textbox");
const getPasswordInput = () => screen.getByPlaceholderText("Password");
const getConfirmPasswordInput = () => screen.getByPlaceholderText("Confirm Password");

const fillValidBaseFields = () => {
  fireEvent.change(getTextInputs()[0], { target: { value: "Samuel User" } });
  fireEvent.change(getTextInputs()[1], { target: { value: "samuel@gmail.com" } });
  fireEvent.change(getTextInputs()[2], { target: { value: "9876543210" } });
  fireEvent.change(getPasswordInput(), { target: { value: "Strong@123" } });
  fireEvent.change(getConfirmPasswordInput(), { target: { value: "Strong@123" } });
};

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("renders all input fields and button", () => {
    renderRegister();

    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();

    expect(getTextInputs().length).toBeGreaterThanOrEqual(3);
    expect(getPasswordInput()).toBeInTheDocument();
    expect(getConfirmPasswordInput()).toBeInTheDocument();
  });

  test("shows error if fields are empty", () => {
    renderRegister();

    fireEvent.click(screen.getByText("Create Account"));

    expect(screen.getByText("All fields are required")).toBeInTheDocument();
  });

  test("shows error if name is less than 3 characters", () => {
    renderRegister();

    fillValidBaseFields();
    fireEvent.change(getTextInputs()[0], { target: { value: "Sa" } });

    fireEvent.click(screen.getByText("Create Account"));

    expect(
      screen.getByText("Full name must be at least 3 characters long")
    ).toBeInTheDocument();
  });

  test("shows error for invalid email", () => {
    renderRegister();

    fillValidBaseFields();
    fireEvent.change(getTextInputs()[1], { target: { value: "ab@gmail.com" } });

    fireEvent.click(screen.getByText("Create Account"));

    expect(
      screen.getByText(
        "Email must be at least 3 characters and end with @gmail.com"
      )
    ).toBeInTheDocument();
  });

  test("shows error for invalid mobile number", () => {
    renderRegister();

    fillValidBaseFields();
    fireEvent.change(getTextInputs()[2], { target: { value: "1234567890" } });

    fireEvent.click(screen.getByText("Create Account"));

    expect(
      screen.getByText("Mobile number must be 10 digits and start with 6-9")
    ).toBeInTheDocument();
  });

  test("shows error for password mismatch", () => {
    renderRegister();

    fireEvent.change(getTextInputs()[0], {
      target: { value: "Samuel" },
    });

    fireEvent.change(getTextInputs()[1], {
      target: { value: "sam@gmail.com" },
    });

    fireEvent.change(getTextInputs()[2], {
      target: { value: "9876543210" },
    });

    fireEvent.change(getPasswordInput(), {
      target: { value: "Strong@123" },
    });

    fireEvent.change(getConfirmPasswordInput(), {
      target: { value: "Wrong@123" },
    });

    fireEvent.click(screen.getByText("Create Account"));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("successful registration navigates to login", async () => {
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    renderRegister();

    fireEvent.change(getTextInputs()[0], {
      target: { value: "Samuel" },
    });

    fireEvent.change(getTextInputs()[1], {
      target: { value: "sam@gmail.com" },
    });

    fireEvent.change(getTextInputs()[2], {
      target: { value: "9876543210" },
    });

    fireEvent.change(getPasswordInput(), {
      target: { value: "Strong@123" },
    });

    fireEvent.change(getConfirmPasswordInput(), {
      target: { value: "Strong@123" },
    });

    fireEvent.click(screen.getByText("Create Account"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("shows backend validation message when registration fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Email already registered" }),
    });

    renderRegister();

    fillValidBaseFields();
    fireEvent.click(screen.getByText("Create Account"));

    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeInTheDocument();
    });
  });

  test("shows password strength hint for weak password", () => {
    renderRegister();

    fireEvent.change(getPasswordInput(), {
      target: { value: "weak" },
    });

    expect(screen.getByText(/weak password/i)).toBeInTheDocument();
  });
});
