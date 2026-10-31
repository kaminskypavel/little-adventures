import { defineRelations } from "drizzle-orm";

import { waitlist } from "./schema";

export const relations = defineRelations({ waitlist });
