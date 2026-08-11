import type { ChipProps } from "@mui/material/Chip";
import Chip from "@mui/material/Chip";

const OUTCOME_COLORS: Record<string, ChipProps["color"]> = {
  Adoption: "success",
  "Return to Owner": "primary",
  Transfer: "info",
  Euthanasia: "error",
  Died: "error",
};

export const OutcomeChip = ({ value }: { value: string | null }) =>
  value ? (
    <Chip size="small" variant="outlined" color={OUTCOME_COLORS[value] ?? "default"} label={value} />
  ) : (
    <>—</>
  );
