import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { extractPdfText } from "../utils/specImport.js";
import { goTo, renderApp } from "../test/helpers.jsx";

vi.mock("../utils/specImport.js", async () => {
  const { generateSubjectDraftFromSpecText } = await import("../utils/specInference.js");
  return { extractPdfText: vi.fn(), generateSubjectDraftFromPdfText: generateSubjectDraftFromSpecText };
});

describe("Settings", () => {
  it("edits and deletes default subjects", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");

    const name = screen.getByLabelText("Subject name physics");
    await user.clear(name);
    await user.type(name, "Advanced Physics");
    expect(screen.queryByLabelText("Tier physics")).toBeNull();
    await user.selectOptions(screen.getByLabelText("Exam board physics"), "AQA");
    await user.selectOptions(screen.getByLabelText("Qualification physics"), "gcse");
    await user.selectOptions(screen.getByLabelText("Tier physics"), "higher");
    fireEvent.change(screen.getByLabelText("Subject colour physics"), { target: { value: "#ff7a59" } });
    await goTo(user, "Planner");

    expect(screen.getByRole("button", { name: "Advanced Physics" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Physics" })).toBeNull();
    expect(screen.getAllByText("AQA GCSE Advanced Physics (Higher)").length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.id === "physics");
    expect(stored).toMatchObject({ board: "AQA", qualification: "gcse", tier: "higher", spec: null, exam: "AQA" });

    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: "Delete subject maths" }));
    await goTo(user, "Planner");
    expect(screen.queryByRole("button", { name: "Maths" })).toBeNull();
    expect(localStorage.getItem("sb-subjects")).toContain("Advanced Physics");
  });

  it("switches themes and persists the selection", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: /Paper/ }));

    expect(screen.getByRole("button", { name: /Paper/ }).getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("sb-theme")).toBe('"paper"');
  });

  it("imports a spec PDF into the creation form and creates the subject", async () => {
    const user = userEvent.setup();
    extractPdfText.mockResolvedValueOnce(`
      AQA A Level Art History Specification 1 Introduction to Art History 1.1 Ancient Art
      1.2 Modern Art 2 Key Movements 2.1 Renaissance 2.2 Modernism
    `);
    renderApp();
    await goTo(user, "Settings");

    const file = new File(["spec"], "aqa-art-history-specification.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Import subject specification PDF"), file);

    expect(await screen.findByDisplayValue("Art History")).toBeTruthy();
    expect(screen.getByDisplayValue("AQA")).toBeTruthy();
    expect(screen.getByText("Ancient Art")).toBeTruthy();
    expect(screen.getByText("5 topics found")).toBeTruthy();
    // No spec code, so no catalogue match: the pre-catalogue flow is unchanged.
    expect(screen.queryByRole("radio")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Create subject" }));
    await goTo(user, "Planner");
    expect(screen.getByRole("button", { name: "Art History" })).toBeTruthy();
    expect(screen.getByText("Ancient Art")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.name === "Art History");
    expect(stored).toMatchObject({ board: "AQA", exam: "AQA", spec: null, tier: null });
  });

  describe("spec PDF matching the catalogue", () => {
    const AQA_MATHS = `GCSE MATHEMATICS (8300) Specification For teaching from September 2015 onwards
      Visit aqa.org.uk/8300 for the most up-to-date specifications
      Why choose AQA for GCSE Mathematics
      3.1 Number 3.2 Algebra`;

    const uploadSpec = async (user, text, name = "spec.pdf") => {
      extractPdfText.mockResolvedValueOnce(text);
      renderApp();
      await goTo(user, "Settings");
      await user.upload(
        screen.getByLabelText("Import subject specification PDF"),
        new File(["spec"], name, { type: "application/pdf" })
      );
    };

    it("offers StudyBox's topic list by default and seeds catalogue topics", async () => {
      const user = userEvent.setup();
      await uploadSpec(user, AQA_MATHS);

      const catalogueOption = await screen.findByRole("radio", {
        name: /Use StudyBox's topic list for AQA GCSE Mathematics \(21 topics\)/,
      });
      expect(catalogueOption.checked).toBe(true);
      expect(screen.getByRole("radio", { name: /Use topics read from the PDF \(2 topics\)/ }).checked).toBe(false);
      expect(screen.getByDisplayValue("Mathematics")).toBeTruthy();
      expect(screen.getByText("21 topics from StudyBox's catalogue")).toBeTruthy();
      expect(screen.getByText("Structure and calculation")).toBeTruthy();

      await user.click(screen.getByRole("button", { name: "Create subject" }));
      const stored = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.name === "Mathematics");
      expect(stored).toMatchObject({ qualification: "gcse", board: "AQA", spec: "8300", specName: "Mathematics" });
      expect(stored.topics).toHaveLength(21);
      expect(stored.topics[0]).toMatchObject({
        name: "Structure and calculation",
        catalogueTopicId: "aqa-8300-t01",
        paper: ["p1", "p2", "p3"],
      });
      expect(stored.papers.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
      expect(stored.topics.filter((t) => t.higherOnly)).toHaveLength(8);
      expect(stored.topics.every((t) => t.catalogueTopicId && !t.done)).toBe(true);
    });

    it("can use the topics read from the PDF instead", async () => {
      const user = userEvent.setup();
      await uploadSpec(user, AQA_MATHS);

      await user.click(await screen.findByRole("radio", { name: /Use topics read from the PDF/ }));
      expect(screen.getByText("2 topics found")).toBeTruthy();
      expect(screen.queryByText("Structure and calculation")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Create subject" }));
      const stored = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.name === "Mathematics");
      expect(stored.topics.map((t) => t.name)).toEqual(["Number", "Algebra"]);
      expect(stored.topics.some((t) => "catalogueTopicId" in t)).toBe(false);
      expect(stored).toMatchObject({ board: "AQA", spec: "8300", qualification: "gcse" });
    });

    it("notes that set texts aren't included for specs with option groups", async () => {
      const user = userEvent.setup();
      await uploadSpec(
        user,
        `GCSE ENGLISH LITERATURE (8702) Specification. Why choose AQA for GCSE English Literature
         3.1 Shakespeare and the 19th-century novel`
      );
      expect(await screen.findByText(/Set texts and optional papers aren't included/)).toBeTruthy();
    });

    it("prefills board, spec and qualification for a code the catalogue doesn't have", async () => {
      const user = userEvent.setup();
      await uploadSpec(
        user,
        `Qualification Accredited GCSE (9–1) Specification Computer Science J277 For first assessment in 2022
         OCR is part of Cambridge University Press & Assessment
         1.1 Systems architecture 1.2 Memory and storage`
      );

      expect(await screen.findByText("2 topics found")).toBeTruthy();
      expect(screen.queryByRole("radio")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Create subject" }));
      const stored = JSON.parse(localStorage.getItem("sb-subjects")).find((s) => s.spec === "J277");
      expect(stored).toMatchObject({ board: "OCR", spec: "J277", qualification: "gcse", exam: "OCR" });
      expect(stored.topics.map((t) => t.name)).toEqual(["Systems Architecture", "Memory and Storage"]);
    });
  });

  describe("backup and restore", () => {
    const captureDownload = () => {
      let blob;
      URL.createObjectURL = vi.fn((b) => {
        blob = b;
        return "blob:test";
      });
      URL.revokeObjectURL = vi.fn();
      const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      return { click, getBlob: () => blob };
    };

    it("exports valid JSON and restores identical state after storage is wiped", async () => {
      const user = userEvent.setup();
      const { getBlob } = captureDownload();
      localStorage.setItem(
        "sb-sessions",
        JSON.stringify([
          {
            id: "s1",
            subjectId: "physics",
            subjectName: "Physics",
            subjectColor: "#4F9CF9",
            duration: 1800,
            date: "2026-06-19T09:00:00.000Z",
            note: "",
            tags: ["Recap"],
          },
        ])
      );
      const view = renderApp();
      await goTo(user, "Settings");
      await user.click(screen.getByRole("button", { name: /Forest/ }));
      await user.click(screen.getByRole("button", { name: "Download backup" }));

      const text = await getBlob().text();
      const backup = JSON.parse(text);
      expect(backup.theme).toBe("forest");
      expect(backup.sessions).toHaveLength(1);
      expect(backup.subjects.length).toBeGreaterThan(0);

      const before = {
        subjects: localStorage.getItem("sb-subjects"),
        sessions: localStorage.getItem("sb-sessions"),
        game: localStorage.getItem("sb-game"),
      };

      view.unmount();
      localStorage.clear();
      renderApp({ onboarded: true });
      await goTo(user, "Settings");
      await user.upload(
        screen.getByLabelText("Restore backup file"),
        new File([text], "studybox-backup.json", { type: "application/json" })
      );

      expect(await screen.findByText("Backup restored.")).toBeTruthy();
      await waitFor(() => expect(localStorage.getItem("sb-sessions")).toBe(before.sessions));
      expect(localStorage.getItem("sb-subjects")).toBe(before.subjects);
      expect(localStorage.getItem("sb-theme")).toBe('"forest"');
      expect(JSON.parse(localStorage.getItem("sb-game")).totalXP).toBe(
        JSON.parse(before.game).totalXP
      );
    });

    it("fails visibly on a malformed file and leaves existing data untouched", async () => {
      const user = userEvent.setup();
      renderApp();
      await goTo(user, "Settings");
      const before = localStorage.getItem("sb-subjects");

      await user.upload(
        screen.getByLabelText("Restore backup file"),
        new File(["{not json"], "bad.json", { type: "application/json" })
      );
      expect((await screen.findByRole("alert")).textContent).toMatch(/valid JSON/);

      await user.upload(
        screen.getByLabelText("Restore backup file"),
        new File(['{"hello":"world"}'], "other.json", { type: "application/json" })
      );
      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toMatch(/doesn't look like a StudyBox backup/)
      );
      expect(localStorage.getItem("sb-subjects")).toBe(before);
    });
  });

  describe("Asana integration", () => {
    it("is off by default: no tab in the planner, opt-in framing in settings", async () => {
      const user = userEvent.setup();
      renderApp();

      expect(screen.queryByRole("button", { name: /Asana/i })).toBeNull();
      expect(screen.queryByText(/NEA/)).toBeNull();

      await goTo(user, "Settings");
      expect(screen.getByRole("button", { name: "Connect Asana" })).toBeTruthy();
      expect(screen.queryByLabelText("Asana project GID")).toBeNull();
    });

    it("appears only after opting in and disappears when disabled", async () => {
      const user = userEvent.setup();
      renderApp();
      await goTo(user, "Settings");
      await user.click(screen.getByRole("button", { name: "Connect Asana" }));
      expect(screen.getByLabelText("Asana project GID").value).toBe("");

      await goTo(user, "Planner");
      await user.click(screen.getByRole("button", { name: "Asana Tasks" }));
      expect(screen.getByText(/Paste an Asana personal access token/)).toBeTruthy();

      await goTo(user, "Settings");
      await user.click(screen.getByRole("button", { name: "Disable Asana integration" }));
      await goTo(user, "Planner");
      expect(screen.queryByRole("button", { name: "Asana Tasks" })).toBeNull();
      expect(screen.getByText(/Add tag|Add topic to/i)).toBeTruthy();
    });

    it("keeps a previously connected user's integration enabled", () => {
      localStorage.setItem("studybox_asana_pat", "token");
      localStorage.setItem("sb-asana", JSON.stringify({ name: "NEA Tasks", projectGid: "123" }));
      renderApp();
      expect(screen.getByRole("button", { name: "NEA Tasks" })).toBeTruthy();
    });

    it("does not enable legacy configs that never connected a token", () => {
      localStorage.setItem("sb-asana", JSON.stringify({ name: "NEA Tasks", projectGid: "123" }));
      renderApp();
      expect(screen.queryByRole("button", { name: "NEA Tasks" })).toBeNull();
      expect(JSON.parse(localStorage.getItem("sb-asana")).projectGid).toBe("");
    });
  });
});
