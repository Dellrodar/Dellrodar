import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../src/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  const baseProps = {
    open: true,
    title: "Archive A000001?",
    message: "Archived animals are hidden from search.",
    confirmLabel: "Archive",
  };

  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog {...baseProps} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the title and message and fires onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Archive A000001?" })).toBeInTheDocument();
    expect(screen.getByText("Archived animals are hidden from search.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("fires onCancel from the cancel button", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
