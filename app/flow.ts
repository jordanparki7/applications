export type Question = {
  id: string;
  prompt: string;
  type: "text" | "multiple-choice" | "yesno" | "commentclick";
  options?: string[]; // Only for multiple-choice questions
  next?: string; // ID of the next question
  validate?: (v: unknown) => string | undefined; // Validation function
};

export const required = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? undefined : "Required";

export const minLen = (n: number) => (v: unknown) =>
    typeof v === "string" && v.trim().length >= n ? undefined : `Must be at least ${n} characters`;
