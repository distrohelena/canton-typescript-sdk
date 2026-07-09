import { CreateAndExerciseCommand } from "./create-and-exercise-command.js";
import { CreateCommand } from "./create-command.js";
import { ExerciseByKeyCommand } from "./exercise-by-key-command.js";
import { ExerciseCommand } from "./exercise-command.js";

export type LedgerCommand =
    | CreateCommand
    | ExerciseCommand
    | ExerciseByKeyCommand
    | CreateAndExerciseCommand;
