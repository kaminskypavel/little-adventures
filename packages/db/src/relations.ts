import { defineRelations } from "drizzle-orm";

import { children, waitlist } from "./schema";

export const relations = defineRelations({ children, waitlist });
