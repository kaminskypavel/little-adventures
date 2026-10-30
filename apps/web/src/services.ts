import { createDb } from "@little-adventures/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
