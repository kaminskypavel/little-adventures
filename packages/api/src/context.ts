import type { Principal } from "@little-adventures/auth";
import type { Database } from "@little-adventures/db";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";

export interface Context {
	/** Model calls that find and redraw the child in a photo. */
	art: ImageEditing;
	db: Database;
	/** Whether the invite code from the submission is right (false when none is set). */
	inviteMatches: (code: string) => boolean;
	/** Whether a signed-in grown-up is in the private beta (the email list, or joined with the code). */
	isBeta: (principal: Principal) => boolean | Promise<boolean>;
	/** The signed-in grown-up, or null for a visitor. */
	principal: Principal | null;
	storage: Storage;
	/** Model call that turns a spoken question into text. */
	voice: Transcription;
	/** Keeps the work running after the response is sent. */
	waitUntil: (work: Promise<unknown>) => void;
}
