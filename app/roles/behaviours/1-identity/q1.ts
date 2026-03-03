import type { Question } from "@/app/flow";
import { required, minLen } from "@/app/flow";

const q1: Question = {
  id: "q1",
  prompt: "What is your Discord username?",
  type: "text",
  validate: required
};

export default q1;