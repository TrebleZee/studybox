import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { THEMES } from "../../utils/themes.js";
import SubjectMetaFields from "./SubjectMetaFields.jsx";

const C = THEMES[0].colors;
const base = { qualification: "alevel", board: "OCR", tier: null, spec: "H556", exam: "OCR" };

describe("SubjectMetaFields", () => {
  it("renders the tier select only for GCSE", () => {
    const { rerender } = render(<SubjectMetaFields C={C} value={base} onChange={() => {}} />);
    expect(screen.queryByLabelText("Tier")).toBeNull();

    rerender(<SubjectMetaFields C={C} value={{ ...base, qualification: "gcse" }} onChange={() => {}} />);
    expect(screen.getByLabelText("Tier")).toBeTruthy();

    rerender(<SubjectMetaFields C={C} value={{ ...base, qualification: "as" }} onChange={() => {}} />);
    expect(screen.queryByLabelText("Tier")).toBeNull();
  });

  it("clears tier when leaving GCSE and clears the spec when the board changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SubjectMetaFields C={C} value={{ ...base, qualification: "gcse", tier: "higher" }} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Qualification"), "alevel");
    expect(onChange).toHaveBeenLastCalledWith({ qualification: "alevel", tier: null });

    await user.selectOptions(screen.getByLabelText("Exam board"), "AQA");
    expect(onChange).toHaveBeenLastCalledWith({ board: "AQA", spec: "", specName: null });
  });

  it("offers a free-text exam label only for Custom boards", () => {
    const { rerender } = render(<SubjectMetaFields C={C} value={base} onChange={() => {}} />);
    expect(screen.queryByLabelText("Exam label")).toBeNull();
    rerender(<SubjectMetaFields C={C} value={{ ...base, board: "Custom", exam: "Tutor" }} onChange={() => {}} />);
    expect(screen.getByLabelText("Exam label").value).toBe("Tutor");
  });

  it("suffixes labels so several subjects can be told apart", () => {
    render(<SubjectMetaFields C={C} value={base} labelSuffix="physics" onChange={() => {}} />);
    expect(screen.getByLabelText("Exam board physics")).toBeTruthy();
    expect(screen.getByLabelText("Spec code physics").value).toBe("H556");
  });
});
