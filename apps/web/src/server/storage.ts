import { createStorage } from "@little-adventures/storage";

import { ENV } from "@/env.server";

export const storage = createStorage(ENV);
