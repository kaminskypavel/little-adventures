import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useSession } from "@/src/auth/use-session";
import { isSetUp } from "@/src/data/adventure-client";

/** Start page: signed out goes to Welcome, signed in goes to Home (or to the child setup first). */
export default function Index() {
	const { status } = useSession();
	const [setUp, setSetUp] = useState<boolean | null>(null);

	useEffect(() => {
		isSetUp().then(setSetUp);
	}, []);

	if (status === "loading") {
		return null;
	}
	if (status === "signed-out") {
		return <Redirect href="/welcome" />;
	}
	if (setUp === null) {
		return null;
	}
	return <Redirect href={setUp ? "/home" : "/child"} />;
}
