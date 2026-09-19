import { render, screen } from "@testing-library/react";
import App from "../App.jsx";

// Most tests exercise the app after first-run setup, so they skip onboarding.
export const renderApp = ({ onboarded = true } = {}) => {
  if (onboarded) localStorage.setItem("sb-onboarded", "true");
  return render(<App />);
};

export const goTo = (user, name) => user.click(screen.getByRole("button", { name }));
