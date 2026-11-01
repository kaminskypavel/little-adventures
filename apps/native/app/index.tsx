import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useSession } from "@/src/auth/use-session";
import { startRoute } from "@/src/data/adventure-client";

/**
 * Start page: signed out goes to Welcome; signed in goes to Home, the grown-up welcome first, or
 * the private beta screen for an account outside the beta.
 */
export default function Index() {
	const { status } = useSession();
	const [start, setStart] = useState<Awaited<
		ReturnType<typeof startRoute>
	> | null>(null);

	useEffect(() => {
		startRoute().then(setStart);
	}, []);

	if (status === "loading") {
		return null;
	}
	if (status === "signed-out") {
		return <Redirect href="/welcome" />;
	}
	if (start === null) {
		return null;
	}
	return <Redirect href={start} />;
}
