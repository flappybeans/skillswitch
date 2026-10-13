import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Skill = Tables["skills"]["Row"];
export type Connection = Tables["connections"]["Row"];
export type Message = Tables["messages"]["Row"];
export type Session = Tables["sessions"]["Row"];