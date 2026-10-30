import { createStorage } from "@little-adventures/storage";

import { ENV } from "@/env";

export const storage = createStorage(ENV);
